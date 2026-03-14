const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  uploadPaymentProof
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const uploadImage = require('../middleware/uploadImage');

// Create order
router.post('/', auth, createOrder);

// Get user's orders
router.get('/', auth, getOrders);

// Get single order
router.get('/:id', auth, getOrder);

// Upload payment proof (MUST BE BEFORE updateOrder)
router.put('/:id/proof', auth, uploadImage.single('receipt'), uploadPaymentProof);

// Update order (Admin only)
router.put('/:id', auth, roleCheck('admin'), updateOrder);

module.exports = router;
