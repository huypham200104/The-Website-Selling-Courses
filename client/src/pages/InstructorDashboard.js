import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './InstructorDashboard.css';

function InstructorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    totalVideos: 0
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const coursesRes = await courseService.getAll();
      const myCourses = (coursesRes.data || []).filter(
        course => course.instructor._id === user._id
      );
      
      setCourses(myCourses);
      
      // Calculate stats
      const totalStudents = myCourses.reduce((sum, course) => sum + (course.students?.length || 0), 0);
      const totalVideos = myCourses.reduce((sum, course) => sum + (course.videos?.length || 0), 0);
      const totalRevenue = myCourses.reduce((sum, course) => sum + (course.price * (course.students?.length || 0)), 0);
      
      setStats({
        totalCourses: myCourses.length,
        totalStudents,
        totalRevenue,
        totalVideos
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Đang tải...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="instructor-dashboard">
        <div className="dashboard-header">
          <h1>👨‍🏫 Dashboard Instructor</h1>
          <p>Chào mừng trở lại, {user?.name}!</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{stats.totalCourses}</h3>
              <p>Khóa học</p>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">👨‍🎓</div>
            <div className="stat-content">
              <h3>{stats.totalStudents}</h3>
              <p>Học viên</p>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">🎬</div>
            <div className="stat-content">
              <h3>{stats.totalVideos}</h3>
              <p>Video</p>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{formatCurrency(stats.totalRevenue)}</h3>
              <p>Doanh thu</p>
            </div>
          </div>
        </div>

        <div className="courses-section">
          <h2>📚 Khóa học của tôi</h2>
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course._id} className="course-card">
                <img src={course.thumbnail} alt={course.title} />
                <div className="course-info">
                  <h3>{course.title}</h3>
                  <p className="course-meta">
                    <span>👨‍🎓 {course.students.length} học viên</span>
                    <span>🎬 {course.videos.length} videos</span>
                  </p>
                  <p className="course-price">{formatCurrency(course.price)}</p>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 && (
            <div className="empty-state">
              <p>📝 Bạn chưa có khóa học nào. Hãy tạo khóa học đầu tiên!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default InstructorDashboard;
