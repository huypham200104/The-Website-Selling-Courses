const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require admin role
router.use(auth);
router.use(roleCheck('admin'));

// Get all users
router.get('/', getAllUsers);

// Create user (Admin only)
router.post('/', createUser);

// Get single user
router.get('/:id', getUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

module.exports = router;
