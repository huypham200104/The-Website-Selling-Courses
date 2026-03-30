/**
 * Script: linkVideo.js
 * Creates a Video document for KiemThu.mp4 and links it to the first course
 * that student1@example.com is enrolled in.
 * Run: node scripts/linkVideo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Video = require('../models/Video');
const User = require('../models/User');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
};

const run = async () => {
  await connectDB();

  // Find student1
  const student = await User.findOne({ email: 'student1@example.com' });
  if (!student) { console.error('❌ student1@example.com not found. Run the seeder first.'); process.exit(1); }

  // Find a course the student is enrolled in
  const course = await Course.findOne({ students: student._id });
  if (!course) { console.error('❌ No course found with student1 enrolled. Run the seeder first.'); process.exit(1); }

  // Check if a video for KiemThu.mp4 already exists
  const existing = await Video.findOne({ videoUrl: '/uploads/videos/KiemThu.mp4' });
  if (existing) {
    console.log('ℹ️  Video record for KiemThu.mp4 already exists:', existing._id.toString());
    console.log('   Linked to course:', course.title);
    await mongoose.disconnect();
    return;
  }

  // Create the Video document
  const video = await Video.create({
    courseId: course._id,
    title: 'KiemThu - Bài học mẫu',
    description: 'Video kiểm thử được upload trực tiếp',
    videoUrl: '/uploads/videos/KiemThu.mp4',
    duration: 0,
    order: 1,
  });

  // Link the video to the course
  await Course.findByIdAndUpdate(course._id, { $push: { videos: video._id } });

  console.log('✅ Video created:', video._id.toString());
  console.log('   Title:', video.title);
  console.log('   Linked to course:', course.title);
  console.log('\n👉 Log in as student1@example.com → My Courses → Continue Learning');

  await mongoose.disconnect();
};

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
