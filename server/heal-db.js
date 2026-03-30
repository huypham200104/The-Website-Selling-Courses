const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course');
const Video = require('./models/Video');

dotenv.config();

async function healDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const videos = await Video.find();
    console.log(`Found ${videos.length} videos`);

    for (let video of videos) {
      if (video.courseId) {
        // Add this video to the course's videos array if not already present
        const course = await Course.findById(video.courseId);
        if (course) {
          if (!course.videos.includes(video._id)) {
            console.log(`Adding video ${video.title} to course ${course.title}`);
            course.videos.push(video._id);
            await course.save();
          }
        }
      }
    }

    console.log('Database healed successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

healDb();
