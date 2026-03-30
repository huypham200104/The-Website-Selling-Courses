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

    // Check if there is already a pending order for this exact course
    let order = await Order.findOne({ userId: req.user._id, courseId, status: 'pending' });
    
    // If no existing pending order, create one
    if (!order) {
      order = await Order.create({
        userId: req.user._id,
        courseId,
        amount: course.price,
        paymentMethod,
        status: 'pending'
      });
    }

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

// @desc    Upload payment proof
// @route   PUT /api/orders/:id/proof
// @access  Private
exports.uploadPaymentProof = async (req, res, next) => {
  try {
    console.log('--- Upload Proof Content ---');
    console.log('Order ID:', req.params.id);
    console.log('User ID:', req.user._id);
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log('Order not found');
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify ownership
    if (order.userId.toString() !== req.user._id.toString()) {
      console.log('Not authorized: order user is', order.userId, 'req.user is', req.user._id);
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    if (!req.file) {
      console.log('No req.file provided');
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`;
    console.log('Receipt URL:', receiptUrl);
    
    order.paymentProof = receiptUrl;
    // status can remain pending for admin to review
    await order.save();

    console.log('Order saved successfully');
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error in uploadPaymentProof:', error);
    next(error);
  }
};

