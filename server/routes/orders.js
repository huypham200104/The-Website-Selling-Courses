const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  getPurchaseSummary,
  updateOrder,
  uploadPaymentProof,
  createOrderWithProof,
} = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const uploadImage = require('../middleware/uploadImage');

// Create order + upload proof in one step (student confirms payment)
router.post('/submit', auth, uploadImage.single('receipt'), createOrderWithProof);

// Create order
router.post('/', auth, createOrder);

// Get user's orders
router.get('/', auth, getOrders);

// Get purchase summary for current user
router.get('/summary', auth, getPurchaseSummary);

// Get single order
router.get('/:id', auth, getOrder);

// Upload payment proof (MUST BE BEFORE updateOrder)
router.put('/:id/proof', auth, uploadImage.single('receipt'), uploadPaymentProof);

// Update order (Admin only)
router.put('/:id', auth, roleCheck('admin'), updateOrder);

module.exports = router;
