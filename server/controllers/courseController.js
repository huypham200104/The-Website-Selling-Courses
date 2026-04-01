const Course = require('../models/Course');
const CourseReport = require('../models/CourseReport');
const User = require('../models/User');

const calculateAverageRating = (reviews = []) => {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(2));
};

const normalizeReviews = (reviews = []) =>
  reviews
    .map((review) => (typeof review.toObject === 'function' ? review.toObject() : review))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

    const courses = await Course.find({
      ...query,
      $or: [
        { videos: { $exists: true, $not: { $size: 0 } } },
        { quizzes: { $exists: true, $not: { $size: 0 } } },
      ],
    })
      .select('-reviews')
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

// @desc    Get instructor's own courses (include drafts/empty content)
// @route   GET /api/courses/instructor/mine
// @access  Private (Instructor)
exports.getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .select('-reviews')
      .populate('instructor', 'name avatar')
      .populate('videos', 'title duration')
      .populate('students', '_id')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: courses.length, data: courses });
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
      .select('-reviews')
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

// @desc    Create new course (Admin assigns instructor)
// @route   POST /api/courses
// @access  Private (Admin)
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, price, category, level, instructorId, thumbnail } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can create courses'
      });
    }

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        error: 'instructorId is required'
      });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(400).json({
        success: false,
        error: 'instructorId must belong to an instructor'
      });
    }

    const course = await Course.create({
      title,
      description,
      price,
      category,
      level,
      thumbnail,
      instructor: instructorId
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

    // Prevent instructor from reassigning instructor field
    const updatePayload = { ...req.body };
    if (req.user.role === 'instructor' && updatePayload.instructor) {
      delete updatePayload.instructor;
    }

    // Only admin can change instructor field
    if (updatePayload.instructor && req.user.role === 'admin') {
      const newInstructor = await User.findById(updatePayload.instructor);
      if (!newInstructor || newInstructor.role !== 'instructor') {
        return res.status(400).json({
          success: false,
          error: 'instructor must be a valid instructor account'
        });
      }
    }

    course = await Course.findByIdAndUpdate(req.params.id, updatePayload, {
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

    // Only allow enroll if course has content (at least 1 video or 1 quiz)
    const hasVideos = Array.isArray(course.videos) && course.videos.length > 0;
    const hasQuizzes = Array.isArray(course.quizzes) && course.quizzes.length > 0;
    if (!hasVideos && !hasQuizzes) {
      return res.status(400).json({
        success: false,
        error: 'Khoá học chưa có nội dung (video hoặc bài tập), chưa thể đăng ký'
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

    const allowedStatuses = ['pending', 'published', 'rejected', 'disabled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' });
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
    const rawName = (req.query.instructorName || '').toString().trim();
    const nameRegex = rawName ? new RegExp(rawName, 'i') : null;

    const courses = await Course.find()
      .populate({
        path: 'instructor',
        select: 'name email avatar',
        match: nameRegex ? { name: nameRegex } : undefined,
      })
      .sort({ createdAt: -1 });

    const filtered = nameRegex ? courses.filter((c) => c.instructor) : courses;

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
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

// @desc    Report a course (student -> instructor/admin visibility)
// @route   POST /api/courses/:id/report
// @access  Private (Student)
exports.reportCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name email role');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Require student to be enrolled before reporting
    const isEnrolled = course.students.some((sid) => String(sid) === String(req.user._id));
    if (!isEnrolled) {
      return res.status(403).json({ success: false, error: 'Bạn cần tham gia khóa học này trước khi báo cáo' });
    }

    const { reason, message, contactPhone } = req.body;
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const trimmedPhone = typeof contactPhone === 'string' ? contactPhone.trim() : '';

    if (!trimmedReason && !trimmedMessage) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung báo cáo' });
    }

    const report = await CourseReport.create({
      course: course._id,
      student: req.user._id,
      instructor: course.instructor?._id,
      reason: trimmedReason || 'Không rõ lý do',
      message: trimmedMessage,
      contactPhone: trimmedPhone,
      status: 'open',
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course reports (admin sees all, instructor sees own courses)
// @route   GET /api/courses/reports
// @access  Private (Admin/Instructor)
exports.getCourseReports = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'instructor') {
      filter.instructor = req.user._id;
    }

    const reports = await CourseReport.find(filter)
      .populate('course', 'title')
      .populate('student', 'name email avatar')
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, data: reports });
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

// @desc    Get course reviews
// @route   GET /api/courses/:id/reviews
// @access  Private (Student/Instructor/Admin)
exports.getCourseReviews = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .select('reviews rating reviewCount')
      .populate('reviews.student', 'name avatar role email');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({
      success: true,
      data: normalizeReviews(course.reviews),
      meta: {
        averageRating: course.rating,
        reviewCount: course.reviewCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course review
// @route   POST /api/courses/:id/reviews
// @access  Private (Student)
exports.createCourseReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const parsedRating = Number(rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const course = await Course.findById(req.params.id)
      .populate('reviews.student', 'name avatar role email');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const isEnrolled = course.students.some((studentId) => studentId.toString() === req.user._id.toString());
    if (!isEnrolled) {
      return res.status(403).json({ success: false, error: 'Bạn cần tham gia khóa học này trước khi đánh giá' });
    }

    const alreadyReviewed = course.reviews.some((review) => {
      const reviewerId = review.student?._id || review.student;
      return reviewerId.toString() === req.user._id.toString();
    });
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, error: 'Bạn đã đánh giá khóa học này rồi' });
    }

    course.reviews.push({
      student: req.user._id,
      rating: parsedRating,
      comment: typeof comment === 'string' ? comment.trim() : '',
    });

    course.rating = calculateAverageRating(course.reviews);
    course.reviewCount = course.reviews.length;
    await course.save();
    await course.populate('reviews.student', 'name avatar role email');

    const newReview = course.reviews
      .slice()
      .reverse()
      .find((review) => {
        const reviewerId = review.student?._id || review.student;
        return reviewerId.toString() === req.user._id.toString();
      });

    res.status(201).json({
      success: true,
      data: {
        review: newReview,
        averageRating: course.rating,
        reviewCount: course.reviewCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course review (admin)
// @route   DELETE /api/courses/:courseId/reviews/:reviewId
// @access  Private (Admin)
exports.deleteCourseReview = async (req, res, next) => {
  try {
    const { courseId, reviewId } = req.params;
    const course = await Course.findById(courseId)
      .select('reviews rating reviewCount')
      .populate('reviews.student', 'name avatar role email');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const reviewIndex = course.reviews.findIndex((review) => review._id.toString() === reviewId);
    if (reviewIndex === -1) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    course.reviews.splice(reviewIndex, 1);
    course.rating = calculateAverageRating(course.reviews);
    course.reviewCount = course.reviews.length;
    await course.save();

    res.json({
      success: true,
      data: {
        averageRating: course.rating,
        reviewCount: course.reviewCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get first video of a course for preview (no enrollment needed)
// @route   GET /api/courses/:id/preview-video
// @access  Private (Student - any authenticated user)
exports.getCoursePreviewVideo = async (req, res, next) => {
  try {
    const Video = require('../models/Video');
    const course = await Course.findById(req.params.id).select('videos title status');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (!course.videos || course.videos.length === 0) {
      return res.status(404).json({ success: false, error: 'Khóa học chưa có video' });
    }

    // Get first video by order
    const firstVideo = await Video.findOne({ courseId: course._id }).sort({ order: 1, createdAt: 1 }).select('_id title duration order');

    if (!firstVideo) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy video' });
    }

    res.json({ success: true, data: firstVideo });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to a course review (instructor or admin)
// @route   PATCH /api/courses/:courseId/reviews/:reviewId/reply
// @access  Private (Instructor/Admin)
exports.replyCourseReview = async (req, res, next) => {
  try {
    const { courseId, reviewId } = req.params;
    const { text } = req.body;

    const trimmed = (text || '').toString().trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, error: 'Nội dung phản hồi không được để trống' });
    }
    if (trimmed.length > 1000) {
      return res.status(400).json({ success: false, error: 'Phản hồi tối đa 1000 ký tự' });
    }

    const course = await Course.findById(courseId)
      .select('reviews instructor')
      .populate('reviews.student', 'name avatar email role')
      .populate('instructor', 'name email');

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (req.user.role === 'instructor' && course.instructor?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Bạn không thể phản hồi khóa học này' });
    }

    const review = course.reviews.find((r) => r._id.toString() === reviewId);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    review.reply = {
      text: trimmed,
      repliedBy: req.user._id,
      repliedAt: new Date()
    };

    await course.save();

    res.json({ success: true, data: { reply: review.reply } });
  } catch (error) {
    next(error);
  }
};
