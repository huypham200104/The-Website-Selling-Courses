const mongoose = require('mongoose');

const courseReportSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  contactPhone: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'dismissed'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CourseReport', courseReportSchema);
