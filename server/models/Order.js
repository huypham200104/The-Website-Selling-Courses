const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['initiated', 'pending', 'completed', 'failed'],
    // Start as initiated; moves to pending once proof is uploaded
    default: 'initiated'
  },
  paymentMethod: String,
  transactionId: String,
  paymentProof: {
    type: String, // Trữ URL/tên file ảnh bill
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
