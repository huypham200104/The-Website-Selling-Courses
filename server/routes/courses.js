const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse
} = require('../controllers/courseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);

// Private routes
router.post('/', auth, roleCheck('instructor', 'admin'), createCourse);
router.put('/:id', auth, roleCheck('instructor', 'admin'), updateCourse);
router.delete('/:id', auth, roleCheck('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', auth, enrollCourse);

module.exports = router;
