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
    let query = {};

    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    } else {
      const status = req.query.status;
      const search = (req.query.search || '').trim();
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;

      if (status) query.status = status;
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
      if (search) {
        const User = require('../models/User');
        const mongoose = require('mongoose');
        const users = await User.find({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = users.map(u => u._id);
        const searchConditions = [{ userId: { $in: userIds } }];
        if (mongoose.Types.ObjectId.isValid(search) && search.length >= 6) {
          try {
            searchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
          } catch (_) {}
        }
        query.$and = (query.$and || []).concat([{ $or: searchConditions }]);
      }
    }

    const orders = await Order.find(query)
      .populate('courseId', 'title price thumbnail')
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });

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
