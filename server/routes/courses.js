const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  uploadThumbnail
} = require('../controllers/courseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { uploadThumbnail: uploadThumbnailMw } = require('../middleware/upload');

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);

// Private routes
router.post('/', auth, roleCheck('instructor', 'admin'), createCourse);
router.put('/:id', auth, roleCheck('instructor', 'admin'), updateCourse);
router.put('/:id/thumbnail', auth, roleCheck('instructor', 'admin'), uploadThumbnailMw.single('thumbnail'), uploadThumbnail);
router.delete('/:id', auth, roleCheck('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', auth, enrollCourse);

module.exports = router;
