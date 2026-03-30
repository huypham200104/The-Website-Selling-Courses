const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course');
const Video = require('./models/Video');

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const courses = await Course.find().populate('videos');
  console.log(`Found ${courses.length} courses`);
  
  for (let course of courses) {
    console.log(`Course: ${course.title} (ID: ${course._id})`);
    console.log(`- Videos array length: ${course.videos.length}`);
    course.videos.forEach(v => {
      console.log(`  - Video: ${v.title} (ID: ${v._id})`);
    });
  }

  const allVideos = await Video.find();
  console.log(`\nTotal videos in DB: ${allVideos.length}`);
  for (let v of allVideos) {
    console.log(`- Video: ${v.title} (CourseID: ${v.courseId})`);
  }

  process.exit(0);
}

check();
