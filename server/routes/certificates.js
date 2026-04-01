const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const Course = require('../models/Course');
const QuizResult = require('../models/QuizResult');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to build a stable quiz key
const getQuizKey = (quiz = {}) => quiz._id?.toString?.() || quiz.id || quiz.quizId || quiz.title || '';

// Verify completion: enrolled, course has >=1 video and >=2 quizzes, all quizzes passed (>=50%)
async function ensureCompletionOrThrow({ course, studentId }) {
  const enrolled = Array.isArray(course.students) && course.students.some((s) => s.toString() === studentId);
  if (!enrolled) {
    const err = new Error('Bạn chưa tham gia khóa học này');
    err.statusCode = 403;
    throw err;
  }

  // Structural requirement: at least 1 video and 2 quizzes (tự luận hoặc trắc nghiệm)
  const videoCount = Array.isArray(course.videos) ? course.videos.length : 0;
  const quizzes = course.quizzes || [];
  if (videoCount < 1 || quizzes.length < 2) {
    const err = new Error('Khóa học cần tối thiểu 1 video và 2 bài tập để cấp chứng chỉ');
    err.statusCode = 400;
    throw err;
  }

  const results = await QuizResult.find({ course: course._id, student: studentId, status: 'graded' });
  const hasPassedAll = quizzes.every((quiz) => {
    const key = getQuizKey(quiz);
    if (!key) return false;
    const result = results.find((r) => r.quizId === key);
    return result && result.score >= 5; // >=50%
  });

  if (!hasPassedAll) {
    const err = new Error('Bạn chưa hoàn thành toàn bộ bài kiểm tra của khóa học');
    err.statusCode = 400;
    throw err;
  }
}

function buildCertificate(doc, { student, course, completionDate }) {
  const fontPath = path.join(__dirname, '..', 'fonts', 'NotoSans-Regular.ttf');
  try {
    doc.font(fontPath);
  } catch (err) {
    console.error('Font load failed, fallback to default:', err.message);
  }

  // Frame
  doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(3).stroke('#0f172a');

  doc.fontSize(24).fillColor('#0f172a').text('Certificate of Completion', { align: 'center', underline: true, lineGap: 8, paragraphGap: 12 });

  doc.moveDown(1.2);
  doc.fontSize(18).fillColor('#1f2937').text(`Student: ${student.name || 'N/A'}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#334155').text(`Email: ${student.email || 'N/A'}`, { align: 'center' });

  doc.moveDown(1.5);
  doc.fontSize(18).fillColor('#111827').text('Has successfully completed the course:', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(20).fillColor('#0f172a').text(course.title || 'Course', { align: 'center', lineGap: 4 });

  doc.moveDown(1.5);
  doc.fontSize(14).fillColor('#475569').text(`Completion Date: ${completionDate}`, { align: 'center' });
  if (course.instructor?.name) {
    doc.moveDown(0.3);
    doc.text(`Instructor: ${course.instructor.name}`, { align: 'center' });
  }

  doc.moveDown(2);
  doc.fontSize(12).fillColor('#94a3b8').text('This certificate confirms the student has completed all required lessons and assessments for the course.', {
    align: 'center',
    width: doc.page.width - 120,
    lineGap: 4,
  });

  doc.moveDown(3);
  doc.fontSize(12).fillColor('#0f172a').text('Instructor Signature', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(24).fillColor('#0ea5e9').text('____________________', { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#94a3b8').text('Certificate ID: ' + course._id.toString().slice(-8).toUpperCase(), { align: 'center' });
}

// @route   GET /api/certificates/:courseId
// @desc    Tải chứng nhận hoàn thành khóa học (PDF)
// @access  Private (Student)
router.get('/:courseId', auth, authorize('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate('instructor', 'name email');
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học' });

    const studentId = req.user._id.toString();
    await ensureCompletionOrThrow({ course, studentId });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `certificate-${course._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Lỗi tạo chứng nhận' });
      }
    });

    doc.pipe(res);
    const completionDate = new Date().toLocaleDateString('vi-VN');
    buildCertificate(doc, { student: req.user, course, completionDate });
    doc.end();
  } catch (error) {
    console.error('Certificate error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Lỗi tạo chứng nhận' });
  }
});

module.exports = router;
