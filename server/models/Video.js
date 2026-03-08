const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  videoUrl: {
    type: String,
    required: true
  },
  duration: Number, // in seconds
  order: {
    type: Number,
    default: 0
  },
  thumbnail: String,
  size: Number, // in bytes
  quality: [{
    resolution: String, // '360p', '480p', '720p', '1080p'
    url: String
  }],
  // Keyframe seek table: [{t: seconds, b: byteOffset}] — built by gen-seek-table.js
  seekTable: [{
    t: Number,  // presentation time in seconds
    b: Number,  // byte offset of the moof box
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema);
