const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Order = require('../models/Order');
const seedData = require('./seedData');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Import dữ liệu mẫu vào database
const importData = async () => {
  try {
    console.log('\n🚀 Starting data import...\n');

    // Xóa dữ liệu cũ
    console.log('🗑️  Clearing old data...');
    await User.deleteMany();
    await Course.deleteMany();
    await Video.deleteMany();
    await Order.deleteMany();
    console.log('✅ Old data cleared\n');

    // 1. Tạo Users
    console.log('👤 Creating users...');
    const usersWithHashedPasswords = await Promise.all(
      seedData.users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );
    
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Lấy instructor và students
    const instructor = createdUsers.find(u => u.role === 'instructor');
    const students = createdUsers.filter(u => u.role === 'student');

    // 2. Tạo Courses
    console.log('\n📚 Creating courses...');
    const coursesWithInstructor = seedData.courses.map(course => ({
      ...course,
      instructor: instructor._id,
      students: [students[0]._id] // Student đầu tiên đã mua course
    }));

    const createdCourses = await Course.insertMany(coursesWithInstructor);
    console.log(`✅ Created ${createdCourses.length} courses`);

    // 3. Tạo Videos
    console.log('\n🎬 Creating videos...');
    const allVideos = [];
    
    // Phân phối videos cho các courses
    const videosPerCourse = [
      seedData.videos.slice(0, 3),  // React course - 3 videos
      seedData.videos.slice(3, 5),  // Node.js course - 2 videos
      seedData.videos.slice(5, 7),  // JavaScript course - 2 videos
    ];

    for (let i = 0; i < Math.min(3, createdCourses.length); i++) {
      const courseVideos = videosPerCourse[i].map(video => ({
        ...video,
        courseId: createdCourses[i]._id,
        videoUrl: `/uploads/videos/sample-video-${i + 1}.mp4`, // Placeholder
        size: 10485760 // 10MB placeholder
      }));
      
      const videos = await Video.insertMany(courseVideos);
      allVideos.push(...videos);

      // Update course với video IDs
      await Course.findByIdAndUpdate(createdCourses[i]._id, {
        videos: videos.map(v => v._id)
      });
    }
    console.log(`✅ Created ${allVideos.length} videos`);

    // 4. Tạo Orders
    console.log('\n💰 Creating orders...');
    const orders = [
      {
        userId: students[0]._id,
        courseId: createdCourses[0]._id,
        amount: createdCourses[0].price,
        status: 'completed',
        paymentMethod: 'Google Pay',
        transactionId: 'TXN001' + Date.now()
      },
      {
        userId: students[0]._id,
        courseId: createdCourses[1]._id,
        amount: createdCourses[1].price,
        status: 'pending',
        paymentMethod: 'Credit Card',
        transactionId: 'TXN002' + Date.now()
      }
    ];

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${createdOrders.length} orders`);

    // 5. Update User purchased courses
    console.log('\n🔄 Updating user purchased courses...');
    await User.findByIdAndUpdate(students[0]._id, {
      purchasedCourses: [createdCourses[0]._id]
    });
    console.log('✅ Updated user data');

    // In thông tin đăng nhập
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATA IMPORT SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    
    console.log('👨‍💼 ADMIN:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123\n');
    
    console.log('👨‍🏫 INSTRUCTOR:');
    console.log('   Email: instructor@example.com');
    console.log('   Password: instructor123\n');
    
    console.log('👨‍🎓 STUDENTS:');
    console.log('   Email: student1@example.com');
    console.log('   Password: student123\n');
    console.log('   Email: student2@example.com');
    console.log('   Password: student123\n');
    
    console.log('='.repeat(60));
    console.log(`📊 STATISTICS:`);
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Courses: ${createdCourses.length}`);
    console.log(`   Videos: ${allVideos.length}`);
    console.log(`   Orders: ${createdOrders.length}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error importing data:', error);
    process.exit(1);
  }
};

// Xóa tất cả dữ liệu
const deleteData = async () => {
  try {
    console.log('\n🗑️  Deleting all data...\n');
    
    await User.deleteMany();
    await Course.deleteMany();
    await Video.deleteMany();
    await Order.deleteMany();
    
    console.log('✅ All data deleted successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    process.exit(1);
  }
};

// Chạy seeder
const runSeeder = async () => {
  await connectDB();

  if (process.argv[2] === '-d') {
    await deleteData();
  } else {
    await importData();
  }
};

runSeeder();
