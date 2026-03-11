import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, orderService } from '../services/apiService';
import './StudentDashboard.css';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my-courses'

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    try {
      const [coursesRes, ordersRes] = await Promise.all([
        courseService.getAll(),
        orderService.getAll()
      ]);

      const allCourses = coursesRes.data || [];
      const allOrders = ordersRes.data || [];

      setCourses(allCourses);
      setMyOrders(allOrders);

      // Filter courses student has purchased (completed orders)
      const purchased = allCourses.filter(course =>
        user?.purchasedCourses?.includes(course._id)
      );
      setMyCourses(purchased);
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEnroll = async (courseId) => {
    if (!window.confirm('Bạn muốn đăng ký khóa học này? Yêu cầu sẽ được gửi tới Admin để duyệt.')) return;

    try {
      await orderService.create({
        courseId,
        paymentMethod: 'Chuyển khoản / Tiền mặt'
      });
      alert('Yêu cầu đăng ký đã được gửi! Vui lòng chờ Admin duyệt hóa đơn.');
      fetchCourses();
    } catch (error) {
      const msg = error.response?.data?.error || 'Lỗi khi đăng ký khóa học';
      alert(msg);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="student-header">
        <div className="header-content">
          <div className="logo">
            <h1>🎓 Course Platform</h1>
          </div>
          <div className="header-right">
            <span className="user-greeting">👋 {user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">🚪 Đăng xuất</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="student-content">
        <div className="content-header">
          <h2>Khóa học của bạn</h2>
          <div className="tabs">
            <button
              className={activeTab === 'all' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('all')}
            >
              📚 Tất cả khóa học
            </button>
            <button
              className={activeTab === 'my-courses' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('my-courses')}
            >
              ⭐ Khóa học của tôi ({myCourses.length})
            </button>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="courses-container">
          {activeTab === 'all' && (
            <div className="courses-grid">
              {courses.map((course) => {
                const isPurchased = myCourses.some(c => c._id === course._id);

                return (
                  <div key={course._id} className="course-card">
                    <img src={course.thumbnail} alt={course.title} />
                    <div className="course-badge">{course.level}</div>
                    <div className="course-content">
                      <h3>{course.title}</h3>
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <span>👨‍🏫 {course.instructor.name}</span>
                        <span>⭐ {course.rating}</span>
                      </div>
                      <div className="course-footer">
                        <span className="price">{formatCurrency(course.price)}</span>
                        {isPurchased ? (
                          <button className="btn-enrolled" disabled>✅ Đã sở hữu</button>
                        ) : myOrders.some(o => o.courseId?._id === course._id && o.status === 'pending') ? (
                          <button className="btn-pending" disabled>⏳ Chờ duyệt</button>
                        ) : (
                          <button
                            className="btn-enroll"
                            onClick={() => handleEnroll(course._id)}
                          >
                            Đăng ký ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'my-courses' && (
            <div className="courses-grid">
              {myCourses.length === 0 ? (
                <div className="empty-state">
                  <p>📚 Bạn chưa đăng ký khóa học nào</p>
                  <button onClick={() => setActiveTab('all')} className="btn-browse">
                    Khám phá khóa học
                  </button>
                </div>
              ) : (
                myCourses.map((course) => (
                  <div key={course._id} className="course-card enrolled">
                    <img src={course.thumbnail} alt={course.title} />
                    <div className="course-content">
                      <h3>{course.title}</h3>
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <span>🎬 {course.videos.length} videos</span>
                        <span>⭐ {course.rating}</span>
                      </div>
                      <button className="btn-continue">▶️ Tiếp tục học</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
