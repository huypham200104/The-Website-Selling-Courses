const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { courseId, paymentMethod } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if already purchased
    const user = await User.findById(req.user._id);
    if (user.purchasedCourses.includes(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Course already purchased'
      });
    }

    const order = await Order.create({
      userId: req.user._id,
      courseId,
      amount: course.price,
      paymentMethod,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders (or all orders for admin)
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    console.log('📦 GET /api/orders - User:', req.user ? req.user.email : 'UNDEFINED');
    console.log('📦 User role:', req.user ? req.user.role : 'UNDEFINED');
    
    let query = {};
    
    // If not admin, only show user's own orders
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
      console.log('📦 Non-admin user - filtering by userId:', req.user._id);
    } else {
      console.log('📦 Admin user - fetching ALL orders');
    }
    
    // First, get orders without populate to see if they exist
    const ordersCount = await Order.countDocuments(query);
    console.log('📦 Total orders found:', ordersCount);
    
    const orders = await Order.find(query)
      .populate('courseId', 'title price thumbnail')
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });

    console.log('📦 Orders after populate:', orders.length);
    console.log('📦 First order sample:', orders[0] ? {
      id: orders[0]._id,
      courseId: orders[0].courseId,
      userId: orders[0].userId,
      status: orders[0].status
    } : 'No orders');

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('❌ Error in getOrders:', error);
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('courseId', 'title price thumbnail instructor')
      .populate('userId', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check authorization
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private (Admin)
exports.updateOrder = async (req, res, next) => {
  try {
    const { status, transactionId } = req.body;

    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    order.status = status || order.status;
    order.transactionId = transactionId || order.transactionId;
    await order.save();

    // If order completed, enroll user in course
    if (status === 'completed') {
      await Course.findByIdAndUpdate(order.courseId, {
        $addToSet: { students: order.userId }
      });

      await User.findByIdAndUpdate(order.userId, {
        $addToSet: { purchasedCourses: order.courseId }
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};
