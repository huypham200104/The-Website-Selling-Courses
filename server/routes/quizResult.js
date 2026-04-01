const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const QuizResult = require('../models/QuizResult');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/quizzes/submit
// @desc    Submit a quiz result (creates new or updates if student takes again for better score)
// @access  Private (Student)
router.post('/submit', auth, async (req, res) => {
  try {
    const { courseId, quizId, quizTitle, score, totalQuestions, percentage, answers } = req.body;

    if (!courseId || !quizId || !quizTitle) {
      return res.status(400).json({ message: 'Thiếu thông tin bài nộp' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'courseId không hợp lệ' });
    }

    const safeTotal = Number(totalQuestions);
    let safeScore = Number(score);
    if (!Number.isFinite(safeTotal) || safeTotal <= 0) {
      return res.status(400).json({ message: 'Số câu hỏi không hợp lệ' });
    }

    if (!Number.isFinite(safeScore) || safeScore < 0 || safeScore > 10) {
      return res.status(400).json({ message: 'Điểm không hợp lệ (0-10)' });
    }

    // Optional: We can check if course is purchased by this student
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    }

    const quizInCourse = course.quizzes?.find((q) => q._id?.toString() === quizId || q.quizId === quizId || q.title === quizTitle);
    const isEssayQuiz = quizInCourse?.questions?.some((q) => !q.options || q.options.length === 0);
    if (isEssayQuiz) {
      safeScore = 0; // chấm thủ công sau
    }

    const existing = await QuizResult.findOne({ 
      student: req.user._id, 
      course: courseId, 
      quizId 
    });

    const normalizedAnswers = (() => {
      if (!answers) return {};
      if (Array.isArray(answers)) return { ...answers };
      if (typeof answers === 'object') return answers;
      return {};
    })();

    const computedPercentage = isEssayQuiz ? 0 : (Number.isFinite(percentage) ? percentage : Math.round((safeScore / 10) * 100));
    const autoStatus = isEssayQuiz ? 'pending' : 'graded';

    if (existing) {
      // Essay: only allow retry after graded <=5. MCQ: allow immediate retry and auto-grade.
      if (isEssayQuiz) {
        const canRetry = existing.status === 'graded' && Number(existing.score) <= 5;
        if (!canRetry) {
          return res.status(409).json({
            success: false,
            message: 'Bạn đã nộp bài này, vui lòng chờ giảng viên chấm.'
          });
        }
      }

      existing.score = safeScore;
      existing.totalQuestions = safeTotal;
      existing.percentage = computedPercentage;
      existing.answers = normalizedAnswers;
      existing.status = autoStatus;
      existing.gradedBy = undefined;
      existing.gradedAt = isEssayQuiz ? undefined : new Date();
      await existing.save();

      return res.status(200).json({ success: true, data: existing });
    }

    const result = await QuizResult.create({
      student: req.user._id,
      course: courseId,
      quizId,
      quizTitle,
      score: safeScore,
      totalQuestions: safeTotal,
      percentage: computedPercentage,
      answers: normalizedAnswers,
      status: autoStatus,
      gradedAt: isEssayQuiz ? undefined : new Date()
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    const msg = error?.message || 'Lỗi server khi nộp bài';
    res.status(500).json({ message: msg });
  }
});

// @route   GET /api/quizzes/my-results
// @desc    Get all quiz results for the logged-in student
// @access  Private
router.get('/my-results', auth, async (req, res) => {
  try {
    const results = await QuizResult.find({ student: req.user._id })
      .populate('course', 'title thumbnail')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get my quiz results error:', error);
    res.status(500).json({ message: 'Lỗi server khi tải kết quả' });
  }
});

// @route   GET /api/quizzes/course/:courseId
// @desc    Get all student quiz results for a specific course
// @access  Private (Instructor/Admin)
router.get('/course/:courseId', auth, authorize('instructor', 'admin'), async (req, res) => {
  try {
    // Make sure the course belongs to the instructor (if role is instructor)
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    }

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền truy cập khóa học này' });
    }

    const results = await QuizResult.find({ course: req.params.courseId })
      .populate('student', 'name email avatar')
      .populate('gradedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get course quiz results error:', error);
    res.status(500).json({ message: 'Lỗi server khi tải thống kê khóa học' });
  }
});

// @route   PATCH /api/quizzes/:resultId/grade
// @desc    Instructor/Admin chấm điểm bài nộp
// @access  Private (Instructor/Admin)
router.patch('/:resultId/grade', auth, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { score } = req.body;
    const result = await QuizResult.findById(req.params.resultId).populate('course');
    if (!result) return res.status(404).json({ message: 'Không tìm thấy bài nộp' });

    // Nếu là giảng viên, phải sở hữu khóa học
    if (req.user.role === 'instructor' && result.course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền chấm bài này' });
    }

    const safeScore = Number(score);
    if (Number.isNaN(safeScore) || safeScore < 1 || safeScore > 10) {
      return res.status(400).json({ message: 'Điểm không hợp lệ (1-10)' });
    }

    result.score = safeScore;
    result.percentage = Math.round((safeScore / 10) * 100);
    result.status = 'graded';
    result.gradedBy = req.user._id;
    result.gradedAt = new Date();
    await result.save();

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Grade quiz error:', error);
    res.status(500).json({ message: 'Lỗi server khi chấm bài' });
  }
});

module.exports = router;
