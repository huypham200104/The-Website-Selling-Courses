const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Login with email and password
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
    const user = await User.findById(req.user._id)
      .populate('favorites', 'title price thumbnail instructor rating level description')
      .select('-__v');
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

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, avatar } = req.body;

    console.log('📝 Update profile for user:', req.user._id);

    // Find user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    // Update email (check if email already exists)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
      user.email = email;
    }

    // Update password (require current password)
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập mật khẩu hiện tại'
        });
      }

      // For Google users who don't have password
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản Google không thể đổi mật khẩu'
        });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      console.log('🔑 Password updated');
    }

    await user.save();

    // Remove password from response
    user.password = undefined;

    console.log('✅ Profile updated successfully');

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    next(error);
  }
};

// @desc    Add course to favorites
// @route   POST /api/auth/favorites/:courseId
// @access  Private
exports.addFavorite = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: courseId } },
      { new: true }
    ).populate('favorites', 'title price thumbnail instructor rating level description');

    res.json({
      success: true,
      favorites: user.favorites
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove course from favorites
// @route   DELETE /api/auth/favorites/:courseId
// @access  Private
exports.removeFavorite = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: courseId } },
      { new: true }
    ).populate('favorites', 'title price thumbnail instructor rating level description');

    res.json({
      success: true,
      favorites: user.favorites
    });
  } catch (error) {
    next(error);
  }
};

