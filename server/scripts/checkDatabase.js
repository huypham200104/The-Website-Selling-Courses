const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Course = require('../models/Course');

/**
 * Kiểm tra xem database có dữ liệu chưa
 * Nếu chưa có, tự động chạy seeder
 */
const checkAndSeedDatabase = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Kiểm tra có dữ liệu chưa
    const userCount = await User.countDocuments();
    const courseCount = await Course.countDocuments();

    if (userCount === 0 && courseCount === 0) {
      console.log('\n📦 Database is empty. Running seeder...\n');
      
      // Chạy seeder
      const { execSync } = require('child_process');
      execSync('npm run seed', { stdio: 'inherit' });
      
      console.log('\n✅ Database seeded successfully!');
    } else {
      console.log(`\n✅ Database already has data:`);
      console.log(`   - Users: ${userCount}`);
      console.log(`   - Courses: ${courseCount}\n`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Database check error:', error.message);
    process.exit(1);
  }
};

// Chỉ chạy nếu được gọi trực tiếp
if (require.main === module) {
  checkAndSeedDatabase();
}

module.exports = checkAndSeedDatabase;
