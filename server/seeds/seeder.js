const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Course = require('../models/Course');
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
    const instructors = createdUsers.filter(u => u.role === 'instructor');
    const students = createdUsers.filter(u => u.role === 'student');

    // 2. Tạo Courses
    console.log('\n📚 Creating courses...');
    const coursesWithInstructor = seedData.courses.map((course, idx) => ({
      ...course,
      instructor: instructors[idx % instructors.length]._id,
      students: [] // no student enrolled initially
    }));

    const createdCourses = await Course.insertMany(coursesWithInstructor);
    console.log(`✅ Created ${createdCourses.length} courses`);

    // 3. Bỏ qua tạo video - để trống cho người dùng tự thêm

    // 4. Tạo Orders
    console.log('\n💰 Creating orders...');
    const now = Date.now();
    const orders = [];
    if (students.length >= 2 && createdCourses.length >= 2) {
      orders.push(
        {
          userId: students[0]._id,
          courseId: createdCourses[0]._id,
          amount: createdCourses[0].price,
          status: 'completed',
          paymentMethod: 'Chuyển khoản',
          transactionId: 'TXN-REA-' + now
        },
        {
          userId: students[1]._id,
          courseId: createdCourses[1]._id,
          amount: createdCourses[1].price,
          status: 'completed',
          paymentMethod: 'Momo',
          transactionId: 'TXN-NODE-' + now
        }
      );
    }

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${createdOrders.length} orders`);

    // Apply enrollments and purchasedCourses for completed orders
    for (const ord of createdOrders) {
      if (ord.status === 'completed') {
        await Course.findByIdAndUpdate(ord.courseId, { $addToSet: { students: ord.userId } });
        await User.findByIdAndUpdate(ord.userId, { $addToSet: { purchasedCourses: ord.courseId } });
      }
    }

    // 5. Seed reviews for those enrollments
    console.log('\n💬 Creating reviews...');
    if (students.length >= 2 && createdCourses.length >= 2) {
      const reviewData = [
        { courseId: createdCourses[0]._id, studentId: students[0]._id, rating: 5, comment: 'Khóa React rất chi tiết, ví dụ thực tế.' },
        { courseId: createdCourses[1]._id, studentId: students[1]._id, rating: 4, comment: 'API rõ ràng, dễ hiểu, nên có thêm phần testing.' }
      ];

      for (const r of reviewData) {
        const course = await Course.findById(r.courseId);
        course.reviews.push({ student: r.studentId, rating: r.rating, comment: r.comment });
        course.reviewCount = course.reviews.length;
        course.rating = course.reviews.reduce((s, rv) => s + rv.rating, 0) / course.reviews.length;
        await course.save();
      }
    }
    console.log('✅ Reviews seeded');

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
