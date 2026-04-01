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
  deleteCourseReview
} = require('../controllers/courseController');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getCourses);

// Admin special routes
router.get('/admin/all', auth, roleCheck('admin'), getAdminCourses);

// Get specific course and its sub-resources
router.get('/:id/students', auth, roleCheck('instructor', 'admin'), getCourseStudents);
router.get('/:id/reviews', auth, roleCheck('student', 'instructor', 'admin'), getCourseReviews);
router.post('/:id/reviews', auth, roleCheck('student'), createCourseReview);
router.delete('/:courseId/reviews/:reviewId', auth, roleCheck('admin'), deleteCourseReview);
router.get('/:id', getCourse);

// Private routes
router.put('/:id/status', auth, roleCheck('admin'), updateCourseStatus);

router.post('/', auth, roleCheck('instructor'), createCourse);
router.put('/:id', auth, roleCheck('instructor', 'admin'), updateCourse);
router.delete('/:id', auth, roleCheck('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', auth, enrollCourse);

router.post('/:id/quizzes', auth, roleCheck('instructor', 'admin'), addQuiz);
router.delete('/:id/quizzes/:quizId', auth, roleCheck('instructor', 'admin'), deleteQuiz);

module.exports = router;
