const { GoogleGenAI } = require('@google/genai');
const Course = require('../models/Course');

const FALLBACK_MESSAGE = 'Mình chưa tìm thấy thông tin này trong dữ liệu hiện có.';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getKeywords = (message = '') => {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 8);
};

const buildCourseContext = (course) => {
  const videos = (course.videos || [])
    .slice(0, 8)
    .map((video, index) => `${index + 1}. ${video.title}${video.duration ? ` (${video.duration}s)` : ''}`)
    .join(' | ');

  return [
    `ID: ${course._id.toString()}`,
    `Title: ${course.title || 'N/A'}`,
    `Description: ${course.description || 'N/A'}`,
    `Category: ${course.category || 'N/A'}`,
    `Level: ${course.level || 'N/A'}`,
    `Price: ${course.price ?? 'N/A'}`,
    `Instructor: ${course.instructor?.name || 'N/A'}`,
    `Total Lessons: ${(course.videos || []).length}`,
    `Lessons: ${videos || 'N/A'}`,
    `Rating: ${course.rating ?? 'N/A'}`,
  ].join('\n');
};

const fetchRelevantCourses = async (message, userId, courseId) => {
  const keywords = getKeywords(message);
  const regexes = keywords.map((keyword) => new RegExp(escapeRegex(keyword), 'i'));

  const filters = [];

  if (regexes.length) {
    filters.push({ title: { $in: regexes } });
    filters.push({ description: { $in: regexes } });
    filters.push({ category: { $in: regexes } });
  }

  if (courseId) {
    filters.push({ _id: courseId });
  }

  const matchFilter = filters.length ? { $or: filters } : {};

  const matched = await Course.find(matchFilter)
    .populate('instructor', 'name')
    .populate('videos', 'title duration order')
    .sort({ rating: -1, createdAt: -1 })
    .limit(8)
    .lean();

  if (matched.length >= 3) {
    return matched;
  }

  const enrolled = await Course.find({ students: userId })
    .populate('instructor', 'name')
    .populate('videos', 'title duration order')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const map = new Map();
  [...matched, ...enrolled].forEach((course) => {
    map.set(course._id.toString(), course);
  });

  return Array.from(map.values()).slice(0, 8);
};

exports.chatWithDbAssistant = async (req, res, next) => {
  try {
    if (!ai) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured'
      });
    }

    const { message, history = [], courseId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const courses = await fetchRelevantCourses(message, req.user._id, courseId);

    if (!courses.length) {
      return res.json({
        success: true,
        data: {
          reply: FALLBACK_MESSAGE,
          sources: []
        }
      });
    }

    const contextText = courses.map(buildCourseContext).join('\n\n---\n\n');

    const recentHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${String(item.text || '')}`)
          .join('\n')
      : '';

    const prompt = `You are a course assistant for students.\n`
      + `Only answer from the provided DATABASE CONTEXT.\n`
      + `If the context does not contain the answer, reply exactly with: ${FALLBACK_MESSAGE}\n`
      + `Do not add external knowledge.\n`
      + `Answer in Vietnamese, short and clear.\n\n`
      + `DATABASE CONTEXT:\n${contextText}\n\n`
      + `${recentHistory ? `CHAT HISTORY:\n${recentHistory}\n\n` : ''}`
      + `USER QUESTION:\n${message}`;

    const modelResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
      }
    });

    const reply = (modelResponse?.text || '').trim() || FALLBACK_MESSAGE;

    return res.json({
      success: true,
      data: {
        reply,
        sources: courses.map((course) => ({
          id: course._id,
          title: course.title
        }))
      }
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    // Xử lý lỗi API Key hết hạn hoặc không hợp lệ
    if (error?.status === 400 && (error?.message?.includes('expired') || error?.message?.includes('API_KEY_INVALID'))) {
      return res.json({
        success: true,
        data: {
          reply: 'API Key của hệ thống đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ quản trị viên cập nhật lại API Key mới.',
          sources: []
        }
      });
    }

    // Provide a graceful fallback or error message specifically for Gemini quota/rate limits
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return res.json({
        success: true,
        data: {
          reply: 'Hệ thống chatbot đang quá tải hoặc hết lượt sử dụng theo giới hạn của API Key. Vui lòng thử lại sau hoặc nâng cấp tài khoản Gemini.',
          sources: []
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi lấy dữ liệu chat.'
    });
  }
};
