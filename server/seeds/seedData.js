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
      name: 'Phạm Minh Khoa',
      email: 'instructor2@example.com',
      password: 'instructor123',
      role: 'instructor',
      avatar: 'https://i.pravatar.cc/150?img=5',
      purchasedCourses: []
    },
    {
      name: 'Võ Lan Chi',
      email: 'instructor3@example.com',
      password: 'instructor123',
      role: 'instructor',
      avatar: 'https://i.pravatar.cc/150?img=6',
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
    },
    {
      name: 'Đặng Hoài Nam',
      email: 'student3@example.com',
      password: 'student123',
      role: 'student',
      avatar: 'https://i.pravatar.cc/150?img=7',
      purchasedCourses: []
    },
    {
      name: 'Ngô Thảo Vy',
      email: 'student4@example.com',
      password: 'student123',
      role: 'student',
      avatar: 'https://i.pravatar.cc/150?img=8',
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
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Node.js & Express - Xây dựng RESTful API',
      description: 'Xây dựng backend mạnh mẽ với Node.js và Express. Học MongoDB, Authentication, và Deploy lên production.',
      price: 599000,
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400',
      category: 'Backend Development',
      level: 'intermediate',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'JavaScript cơ bản cho người mới',
      description: 'Bắt đầu lập trình với JavaScript. Khóa học dành cho người chưa có kinh nghiệm lập trình.',
      price: 299000,
      thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400',
      category: 'Programming Basics',
      level: 'beginner',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Full Stack MERN - Dự án thực tế',
      description: 'Xây dựng ứng dụng full stack hoàn chỉnh với MongoDB, Express, React, và Node.js.',
      price: 899000,
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
      category: 'Full Stack',
      level: 'advanced',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'MongoDB từ cơ bản đến nâng cao',
      description: 'Làm chủ MongoDB với các kỹ thuật query, indexing, aggregation, và optimization.',
      price: 449000,
      thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400',
      category: 'Database',
      level: 'intermediate',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Tailwind CSS thực chiến',
      description: 'Xây dựng giao diện hiện đại, responsive với Tailwind CSS và các pattern thực tế.',
      price: 349000,
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
      category: 'Frontend',
      level: 'beginner',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Design System cho lập trình viên',
      description: 'Thiết kế, cấu trúc và tái sử dụng thành phần UI ở quy mô lớn.',
      price: 399000,
      thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
      category: 'Design',
      level: 'intermediate',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Docker & DevOps căn bản',
      description: 'Container hóa ứng dụng, viết Dockerfile chuẩn và triển khai CI/CD đơn giản.',
      price: 459000,
      thumbnail: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400',
      category: 'DevOps',
      level: 'intermediate',
      videos: [],
      students: [],
      status: 'published'
    },
    {
      title: 'Data Analysis với Python',
      description: 'Xử lý dữ liệu với Pandas, trực quan hóa với Matplotlib/Seaborn, làm sạch và chuẩn bị dữ liệu.',
      price: 529000,
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400',
      category: 'Data',
      level: 'intermediate',
      videos: [],
      students: [],
      status: 'published'
    }
  ],
  videos: []
};

module.exports = seedData;
