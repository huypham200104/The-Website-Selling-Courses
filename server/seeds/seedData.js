const bcrypt = require('bcryptjs');

// Mã hóa password mặc định
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Dữ liệu mẫu
const seedData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // Sẽ được hash
      role: 'admin',
      avatar: 'https://i.pravatar.cc/150?img=1',
      purchasedCourses: []
    },
    {
      name: 'Nguyễn Văn A',
      email: 'instructor@example.com',
      password: 'instructor123',
      role: 'instructor',
      avatar: 'https://i.pravatar.cc/150?img=2',
      purchasedCourses: []
    },
    {
      name: 'Trần Thị B',
      email: 'student1@example.com',
      password: 'student123',
      role: 'student',
      avatar: 'https://i.pravatar.cc/150?img=3',
      purchasedCourses: []
    },
    {
      name: 'Lê Văn C',
      email: 'student2@example.com',
      password: 'student123',
      role: 'student',
      avatar: 'https://i.pravatar.cc/150?img=4',
      purchasedCourses: []
    }
  ],

  courses: [
    {
      title: 'Khóa học React.js từ cơ bản đến nâng cao',
      description: 'Học React.js từ đầu với các dự án thực tế. Khóa học bao gồm Hooks, Context API, Redux, và nhiều hơn nữa.',
      price: 499000,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
      category: 'Web Development',
      level: 'intermediate',
      videos: [], // Sẽ được populate sau
      students: [] // Sẽ được populate sau
    },
    {
      title: 'Node.js & Express - Xây dựng RESTful API',
      description: 'Xây dựng backend mạnh mẽ với Node.js và Express. Học MongoDB, Authentication, và Deploy lên production.',
      price: 599000,
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400',
      category: 'Backend Development',
      level: 'intermediate',
      videos: [],
      students: []
    },
    {
      title: 'JavaScript cơ bản cho người mới',
      description: 'Bắt đầu lập trình với JavaScript. Khóa học dành cho người chưa có kinh nghiệm lập trình.',
      price: 299000,
      thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400',
      category: 'Programming Basics',
      level: 'beginner',
      videos: [],
      students: []
    },
    {
      title: 'Full Stack MERN - Dự án thực tế',
      description: 'Xây dựng ứng dụng full stack hoàn chỉnh với MongoDB, Express, React, và Node.js.',
      price: 899000,
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
      category: 'Full Stack',
      level: 'advanced',
      videos: [],
      students: []
    },
    {
      title: 'MongoDB từ cơ bản đến nâng cao',
      description: 'Làm chủ MongoDB với các kỹ thuật query, indexing, aggregation, và optimization.',
      price: 449000,
      thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400',
      category: 'Database',
      level: 'intermediate',
      videos: [],
      students: []
    }
  ],

  videos: [
    // React course videos
    {
      title: 'Giới thiệu về React',
      description: 'Tổng quan về React và môi trường phát triển',
      duration: 900, // 15 phút
      order: 1,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300'
    },
    {
      title: 'Components và Props',
      description: 'Học cách tạo và sử dụng components trong React',
      duration: 1200,
      order: 2,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300'
    },
    {
      title: 'State và Lifecycle',
      description: 'Quản lý state và lifecycle methods',
      duration: 1500,
      order: 3,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300'
    },

    // Node.js course videos
    {
      title: 'Cài đặt Node.js và NPM',
      description: 'Hướng dẫn cài đặt môi trường Node.js',
      duration: 600,
      order: 1,
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300'
    },
    {
      title: 'Express.js cơ bản',
      description: 'Tạo server đầu tiên với Express',
      duration: 1800,
      order: 2,
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300'
    },

    // JavaScript course videos
    {
      title: 'JavaScript là gì?',
      description: 'Giới thiệu về JavaScript và cú pháp cơ bản',
      duration: 800,
      order: 1,
      thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300'
    },
    {
      title: 'Biến và kiểu dữ liệu',
      description: 'Các kiểu dữ liệu trong JavaScript',
      duration: 1000,
      order: 2,
      thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300'
    }
  ]
};

module.exports = seedData;
