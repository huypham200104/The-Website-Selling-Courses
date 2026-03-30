const Course = require('../models/Course');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get dashboard stats (admin), optional date range
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getStats = async (req, res, next) => {
  try {
    const dateFrom = req.query.from ? new Date(req.query.from) : null;
    const dateTo = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : null;

    const orderMatch = {};
    if (dateFrom || dateTo) {
      orderMatch.createdAt = {};
      if (dateFrom) orderMatch.createdAt.$gte = dateFrom;
      if (dateTo) orderMatch.createdAt.$lte = dateTo;
    }

    const orders = await Order.find(orderMatch)
      .populate('courseId', 'title price')
      .populate('userId', 'name email');

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    const courseMatch = {};
    if (dateFrom || dateTo) {
      courseMatch.createdAt = orderMatch.createdAt;
    }
    const totalCourses = await Course.countDocuments(courseMatch);

    const totalStudents = await User.countDocuments({ role: 'student' });

    res.json({
      success: true,
      data: {
        totalCourses,
        totalOrders,
        totalRevenue,
        totalStudents,
        completedOrders: completedOrders.length,
        revenueByMonth: getRevenueByMonth(completedOrders)
      }
    });
  } catch (error) {
    next(error);
  }
};

function getRevenueByMonth(orders) {
  const byMonth = {};
  orders.forEach(o => {
    const key = o.createdAt ? `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}` : 'unknown';
    byMonth[key] = (byMonth[key] || 0) + (o.amount || 0);
  });
  return Object.entries(byMonth)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
