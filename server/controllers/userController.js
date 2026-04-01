const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Create instructor (admin only)
// @route   POST /api/users
// @access  Private (Admin only)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đủ tên, email, mật khẩu' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
      role: 'instructor'
    });

    user.password = undefined;

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    console.log('👥 GET /api/users - Fetching all users');
    
    const users = await User.find()
      .select('-password -__v')
      .sort({ createdAt: -1 });

    console.log('👥 Users found:', users.length);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin only)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -__v')
      .populate('purchasedCourses', 'title price thumbnail');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, messengerLink, facebookUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, messengerLink, facebookUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Do not allow deleting another admin
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Không thể xóa tài khoản admin' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {},
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
