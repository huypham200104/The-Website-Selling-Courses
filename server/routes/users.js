const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUser,
  deleteUser
} = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require admin role
router.use(auth);
router.use(roleCheck('admin'));

// Create instructor
router.post('/', createUser);

// Get all users
router.get('/', getAllUsers);

// Get single user
router.get('/:id', getUser);

// Delete user
router.delete('/:id', deleteUser);

module.exports = router;
