const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    let query = { status: 'published' };
    
    // If admin is requesting, they might want all courses
    // Wait, the route /api/courses is Public. Admin might need a specific query or we just allow query params.
    if (req.query.all === 'true') {
      // In a real app we'd check if user is admin here, but /api/courses is public.
      // Better to check auth conditionally if needed, but for now let's just use query param
      // Actually, if query.all is true, let's just return all (or we create a separate secure endpoint).
      // For safety, let's only return all if they are admin. We can check req.user if auth middleware is applied, but getCourses is public.
      // Since it's public, we shouldn't allow `all=true` without auth. 
      // We will create a new endpoint for admin or just check req.header for token to be safe.
      // Since changing auth for public route is tricky, we'll just implement it securely by adding an admin route later if needed.
      // Let's assume if it's the public endpoint, we only show 'published'.
    }

    const courses = await Course.find(query)
      .populate('instructor', 'name avatar')
      .populate('videos', 'title duration')
      .populate('students', '_id')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: courses.length,
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
      .populate('videos');
    
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
    const { title, description, price, category, level } = req.body;

    const course = await Course.create({
      title,
      description,
      price,
      category,
      level,
      instructor: req.user._id
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

    // Check ownership
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this course'
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
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

// @desc    Update course status
// @route   PUT /api/courses/:id/status
// @access  Private (Admin)
exports.updateCourseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    if (course.status === 'published' && status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Không thể từ chối khoá học đã được duyệt'
      });
    }

    course.status = status;
    await course.save();

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all courses (Admin)
// @route   GET /api/courses/admin/all
// @access  Private (Admin)
exports.getAdminCourses = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate('instructor', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get course students
// @route   GET /api/courses/:id/students
// @access  Private (Admin/Instructor)
exports.getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('students', 'name email avatar roles');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if the user is admin or the instructor of this course
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view students for this course'
      });
    }

    res.json({
      success: true,
      count: course.students.length,
      data: course.students
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Add a quiz to a course
// @route   POST /api/courses/:id/quizzes
// @access  Private (Instructor/Admin)
exports.addQuiz = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check ownership if instructor
    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
    }

    const { title, description, questions } = req.body;
    
    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề và danh sách câu hỏi hợp lệ' });
    }

    course.quizzes.push({ title, description, questions });
    await course.save();

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Error adding quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a quiz from a course
// @route   DELETE /api/courses/:id/quizzes/:quizId
// @access  Private (Instructor/Admin)
exports.deleteQuiz = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check ownership if instructor
    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
    }

    course.quizzes = course.quizzes.filter(q => q._id.toString() !== req.params.quizId);
    await course.save();

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
