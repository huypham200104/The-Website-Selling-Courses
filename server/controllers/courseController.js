const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'name avatar')
        .populate('videos', 'title duration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Course.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: courses.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar email')
      .populate('videos', 'title description duration order thumbnail');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Instructor/Admin)
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, price, category, level, instructor: instructorId } = req.body;

    const instructor = (req.user.role === 'admin' && instructorId) ? instructorId : req.user._id;

    const course = await Course.create({
      title,
      description,
      price,
      category,
      level: level || 'beginner',
      instructor
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor/Admin)
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check ownership or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this course'
      });
    }

    const { instructor: instructorId, thumbnail, ...rest } = req.body;
    const updateData = { ...rest };
    if (req.user.role === 'admin' && instructorId) updateData.instructor = instructorId;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

    course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Instructor/Admin)
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check ownership
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this course'
      });
    }

    await course.deleteOne();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private
exports.enrollCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if already enrolled
    if (course.students.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'Already enrolled in this course'
      });
    }

    // Add student to course
    course.students.push(req.user._id);
    await course.save();

    // Add course to user's purchased courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { purchasedCourses: course._id }
    });

    res.json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload course thumbnail
// @route   PUT /api/courses/:id/thumbnail
// @access  Private (Instructor/Admin)
exports.uploadThumbnail = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
    course.thumbnail = thumbnailUrl;
    await course.save();
    res.json({
      success: true,
      data: { thumbnail: course.thumbnail }
    });
  } catch (error) {
    next(error);
  }
};
