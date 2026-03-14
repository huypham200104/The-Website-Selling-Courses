const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { login, getMe, logout, updateProfile, addFavorite, removeFavorite } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login with email & password
router.post('/login', login);

// @route   GET /api/auth/google
// @desc    Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

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

// @route   PUT /api/auth/profile
// @desc    Update user profile
router.put('/profile', auth, updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', auth, logout);

// @route   POST /api/auth/favorites/:courseId
// @desc    Add course to favorites
router.post('/favorites/:courseId', auth, addFavorite);

// @route   DELETE /api/auth/favorites/:courseId
// @desc    Remove course from favorites
router.delete('/favorites/:courseId', auth, removeFavorite);

module.exports = router;
