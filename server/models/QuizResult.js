const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  quizId: {
    type: String, // Or ObjectId depending on how it's stored in Course.quizzes, treating as String to be safe with Mongoose _id strings
    required: true
  },
  quizTitle: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'graded'],
    default: 'pending'
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, // allow number for trắc nghiệm, string/link for tự luận
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizResult', quizResultSchema);
