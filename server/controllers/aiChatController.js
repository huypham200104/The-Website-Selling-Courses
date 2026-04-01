const mongoose = require('mongoose');
const Course = require('../models/Course');
let genAIClient = null;

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } else {
    console.warn('⚠️  GEMINI_API_KEY is not configured. AI responses will use fallback mode.');
  }
} catch (error) {
  console.warn('⚠️  @google/generative-ai is not available. AI responses will use fallback mode.', error.message);
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(value) + '₫';
};

const buildCourseContext = (courses = []) => {
  if (!courses.length) {
    return 'Chưa có khóa học nào được cung cấp trong hệ thống.';
  }

  return courses
    .map((course, index) => {
      const price = formatCurrency(course.price);
      const rating = course.rating ? `${course.rating.toFixed(1)}/5 (${course.reviewCount || 0} đánh giá)` : 'Chưa có đánh giá';
      return `${index + 1}. ${course.title} | cấp độ: ${course.level || 'mọi trình độ'} | danh mục: ${course.category || 'khác'} | giá: ${price} | đánh giá: ${rating}`;
    })
    .join('\n');
};

const buildFallbackReply = (message = '', courses = []) => {
  if (courses.length) {
    const suggestions = courses
      .slice(0, 3)
      .map((course) => `• ${course.title} (${course.level || 'mọi trình độ'}) – ${formatCurrency(course.price)}`)
      .join('\n');

    return `Mình gợi ý nhanh vài khóa liên quan:\n${suggestions}\nBạn muốn xem khóa nào chi tiết hơn?`;
  }

  return 'Hiện chưa có khóa phù hợp, bạn thử tìm với từ khóa khác nhé!';
};

exports.studentAssistantChat = async (req, res) => {
  try {
    const { message, history = [], courseId } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp câu hỏi hợp lệ.' });
    }

    let referenceCourses = [];

    const baseVisibility = {
      status: 'published',
      $or: [
        { videos: { $exists: true, $not: { $size: 0 } } },
        { quizzes: { $exists: true, $not: { $size: 0 } } },
      ],
    };

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      const course = await Course.findOne({ _id: courseId, ...baseVisibility })
        .select('title description level category price rating reviewCount')
        .lean();
      if (course) {
        referenceCourses = [course];
      }
    }

    if (!referenceCourses.length) {
      const keywords = message
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && isNaN(Number(w)));

      const regex = keywords.length ? new RegExp(keywords.join('|'), 'i') : null;

      const matchQuery = regex
        ? { ...baseVisibility, $or: [{ title: regex }, { description: regex }, { category: regex }] }
        : baseVisibility;

      referenceCourses = await Course.find(matchQuery)
        .select('title description level category price rating reviewCount')
        .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
        .limit(3)
        .lean();

      // If no match, fallback to top picks
      if (!referenceCourses.length) {
        referenceCourses = await Course.find(baseVisibility)
          .select('title description level category price rating reviewCount')
          .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
          .limit(3)
          .lean();
      }
    }

    const courseContext = buildCourseContext(referenceCourses);
    const historyText = Array.isArray(history)
      ? history
          .slice(-6)
          .map((entry) => `${entry.role === 'assistant' ? 'Trợ lý' : 'Người dùng'}: ${entry.text}`)
          .join('\n')
      : '';

    let reply = null;

    if (genAIClient) {
      try {
        const model = genAIClient.getGenerativeModel({ model: DEFAULT_MODEL });
        const prompt = `Bạn là trợ lý học tập thân thiện, hỗ trợ người học bằng tiếng Việt. Luôn dựa vào dữ liệu khóa học được cung cấp để gợi ý khóa học, trả lời câu hỏi và đề xuất lộ trình học.
Thông tin khóa học:
${courseContext}

Lịch sử trò chuyện:
${historyText || 'Chưa có lịch sử.'}

Câu hỏi hiện tại của người dùng: "${message}".
      Yêu cầu trả lời: ngắn gọn (tối đa 1 đoạn ngắn và 3 bullet), tập trung trực tiếp vào câu hỏi, chỉ gợi ý các khóa liên quan nhất từ danh sách trên (tối đa 3 mục), không dài dòng.`;

        const result = await model.generateContent(prompt);
        reply = result?.response?.text()?.trim();
      } catch (aiError) {
        console.error('Gemini API error:', aiError.message);
      }
    }

    if (!reply) {
      reply = buildFallbackReply(message, referenceCourses);
    }

    return res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('studentAssistantChat error:', error);
    const fallback = buildFallbackReply('', []);
    return res.status(200).json({ success: true, data: { reply: fallback }, warning: 'fallback' });
  }
};
