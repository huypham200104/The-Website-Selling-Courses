const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Login with email and password with email and password
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email, passwordLength: password?.length });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    console.log('👤 User found:', user ? `Yes (${user.email})` : 'No');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      });
    }

    // Check password (if user has password - Google users might not have)
    if (!user.password) {
      console.log('⚠️  User has no password');
      return res.status(401).json({
        success: false,
        message: 'Tài khoản này chỉ có thể đăng nhập bằng Google'
      });
    }

    console.log('🔑 Comparing passwords...');
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log('✅ Password match:', isPasswordMatch);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('🎉 Login successful for:', user.email);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản không hỗ trợ đổi mật khẩu (ví dụ: đăng nhập Google)'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};
