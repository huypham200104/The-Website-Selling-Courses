const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { login, getMe, logout, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login with email & password
router.post('/login', login);

// @route   GET /api/auth/google
// @desc    Google OAuth
router.get(
  '/google',
  (req, res, next) => {
    const isMock = process.env.MOCK_GOOGLE_LOGIN === 'true' || 
                   !process.env.GOOGLE_CLIENT_ID ||
                   process.env.GOOGLE_CLIENT_ID === 'your_google_client_id';
    
    if (isMock) {
      console.log('🔄 Developer Mode: Bypassing Google OAuth');
      return res.redirect('/api/auth/google/mock');
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET /api/auth/google/mock
// @desc    Mock Google Login for development
router.get('/google/mock', async (req, res) => {
  try {
    const User = require('../models/User');
    // Find or create a test student
    let user = await User.findOne({ email: 'student1@example.com' });
    
    if (!user) {
      user = await User.create({
        email: 'student1@example.com',
        name: 'Test Student',
        role: 'student',
        googleId: 'test_student_id'
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  } catch (error) {
    console.error('Mock login error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=mock_failed`);
  }
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', auth, getMe);

// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', auth, logout);

// @route   PUT /api/auth/change-password
// @desc    Change password
router.put('/change-password', auth, changePassword);

module.exports = router;
