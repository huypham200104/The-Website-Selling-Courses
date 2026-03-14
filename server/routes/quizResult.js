const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');
const Course = require('../models/Course');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/quizzes/submit
// @desc    Submit a quiz result (creates new or updates if student takes again for better score)
// @access  Private (Student)
router.post('/submit', auth, async (req, res) => {
  try {
    const { courseId, quizId, quizTitle, score, totalQuestions, percentage, answers } = req.body;

    // Optional: We can check if course is purchased by this student
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy khóa học' });
    }

    // Upsert logic: If user re-takes, we can simply overwrite or keep history. Let's just track the latest attempt for simplicity.
    // Use findOneAndUpdate with upsert: true
    let result = await QuizResult.findOne({ 
      student: req.user._id, 
      course: courseId, 
      quizId 
    });

    if (result) {
      // Update existing attempt
      result.score = score;
      result.totalQuestions = totalQuestions;
      result.percentage = percentage;
      result.answers = answers;
      result.quizTitle = quizTitle;
      result.createdAt = Date.now(); // Update time
      await result.save();
    } else {
      // Create new attempt
      result = await QuizResult.create({
        student: req.user._id,
        course: courseId,
        quizId,
        quizTitle,
        score,
        totalQuestions,
        percentage,
        answers
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Lỗi server khi nộp bài' });
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

module.exports = router;
