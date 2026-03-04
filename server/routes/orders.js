const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Create order
router.post('/', auth, createOrder);

// Get user's orders
router.get('/', auth, getOrders);

// Get single order
router.get('/:id', auth, getOrder);

// Update order (Admin only)
router.put('/:id', auth, roleCheck('admin'), updateOrder);

module.exports = router;
