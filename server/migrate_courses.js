const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course'); // Ensure correct path

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const runMigration = async () => {
  await connectDB();
  try {
    const result = await Course.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'published' } }
    );
    // Also update any accidentally pending courses just in case
    const result2 = await Course.updateMany(
      { status: 'pending' },
      { $set: { status: 'published' } }
    );
    console.log(`Updated ${result.modifiedCount + result2.modifiedCount} courses to 'published'.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
