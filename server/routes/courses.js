const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getAdminCourses,
  updateCourseStatus,
  getCourseStudents,
  addQuiz,
  deleteQuiz,
  getCourseReviews,
  createCourseReview,
  deleteCourseReview,
  replyCourseReview,
  getInstructorCourses,
  reportCourse,
  getCourseReports,
  getCoursePreviewVideo,
} = require('../controllers/courseController');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getCourses);

// Instructor courses (include empty) - protected
router.get('/instructor/mine', auth, roleCheck('instructor'), getInstructorCourses);

// Reports
router.post('/:id/report', auth, roleCheck('student'), reportCourse);
router.get('/reports', auth, roleCheck('admin', 'instructor'), getCourseReports);

// Admin special routes
router.get('/admin/all', auth, roleCheck('admin'), getAdminCourses);

// Get specific course and its sub-resources
router.get('/:id/students', auth, roleCheck('instructor', 'admin'), getCourseStudents);
router.get('/:id/reviews', auth, roleCheck('student', 'instructor', 'admin'), getCourseReviews);
router.post('/:id/reviews', auth, roleCheck('student'), createCourseReview);
router.delete('/:courseId/reviews/:reviewId', auth, roleCheck('admin'), deleteCourseReview);
router.patch('/:courseId/reviews/:reviewId/reply', auth, roleCheck('instructor', 'admin'), replyCourseReview);
// Preview video for checkout page (no enrollment required)
router.get('/:id/preview-video', auth, getCoursePreviewVideo);
router.get('/:id', getCourse);

// Private routes
router.put('/:id/status', auth, roleCheck('admin'), updateCourseStatus);

// Only admin can create courses; instructors teach/edit their own
router.post('/', auth, roleCheck('admin'), createCourse);
router.put('/:id', auth, roleCheck('instructor', 'admin'), updateCourse);
router.delete('/:id', auth, roleCheck('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', auth, enrollCourse);

router.post('/:id/quizzes', auth, roleCheck('instructor', 'admin'), addQuiz);
router.delete('/:id/quizzes/:quizId', auth, roleCheck('instructor', 'admin'), deleteQuiz);

module.exports = router;
