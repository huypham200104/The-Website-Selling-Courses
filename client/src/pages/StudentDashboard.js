import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, orderService, authService } from '../services/apiService';
import StudentChatBubble from '../components/StudentChatBubble';
import Footer from '../components/Footer';
import './StudentDashboard.css';

function StudentDashboard() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [pendingCourseIds, setPendingCourseIds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my-courses', 'pending', 'favorites', 'profile'

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseService.getAll();
      const allCourses = response.data || [];
      
      setCourses(allCourses);
      
      // Filter courses student is enrolled in
      const purchased = allCourses.filter(course =>
        course.students?.some(s => s._id === user?._id)
      );
      setMyCourses(purchased);

      // Fetch pending orders
      const ordersRes = await orderService.getAll();
      const allOrders = ordersRes.data || [];
      const pendingIds = allOrders
        .filter(order => order.status === 'pending')
        .map(order => order.courseId?._id || order.courseId)
        .filter(id => id && allCourses.some(c => c._id === id));
        
      // Remove duplicates in case user clicked checkout multiple times
      setPendingCourseIds([...new Set(pendingIds)]);
      
      // Fetch user to get favorites
      const currentUser = await authService.getCurrentUser();
      if (currentUser && currentUser.favorites) {
        const favIds = currentUser.favorites
          .map(fav => typeof fav === 'string' ? fav : fav._id)
          .filter(id => id && allCourses.some(c => c._id === id));
        setFavorites([...new Set(favIds)]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (courseId, e) => {
    e.stopPropagation(); // prevent card click if any
    try {
      if (favorites.includes(courseId)) {
        // remove
        await authService.removeFavorite(courseId);
        setFavorites(prev => prev.filter(id => id !== courseId));
      } else {
        // add
        await authService.addFavorite(courseId);
        setFavorites(prev => [...prev, courseId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage({ text: '', type: '' });
    
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileMessage({ text: 'Mật khẩu mới không khớp!', type: 'error' });
      return;
    }

    try {
      const response = await authService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      });
      
      setProfileMessage({ text: response.message || 'Cập nhật thành công!', type: 'success' });
      
      // Update local context
      if (response.user) {
        setUser(response.user);
      }
      
      // Clear password fields
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      setProfileMessage({ 
        text: error.message || error.response?.data?.message || 'Có lỗi xảy ra', 
        type: 'error' 
      });
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
          <div className="header-left">
            <div className="logo">
              <h1>🎓 Course Platform</h1>
            </div>
            <nav className="header-nav">
              <button
                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                📚 Tất cả khóa học
              </button>
              <button
                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                ⏳ Đang chờ duyệt ({pendingCourseIds.length})
              </button>
              <button
                className={`nav-link ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                ❤️ Yêu thích ({favorites.length})
              </button>
            </nav>
          </div>

          <div className="header-right">
            <div className="profile-menu-container">
              <div className="profile-trigger">
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} 
                  alt="avatar" 
                  className="profile-avatar" 
                />
                <span className="user-greeting">{user?.name} ▾</span>
              </div>
              
              <div className="profile-dropdown">
                <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                  <strong style={{ display: 'block', color: '#2c3e50' }}>{user?.name}</strong>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{user?.email}</span>
                </div>
                
                <button className={`dropdown-item ${activeTab === 'my-courses' ? 'active-dropdown' : ''}`} onClick={() => setActiveTab('my-courses')}>
                  ⭐ Khóa học của tôi ({myCourses.length})
                </button>
                <button className={`dropdown-item ${activeTab === 'profile' ? 'active-dropdown' : ''}`} onClick={() => setActiveTab('profile')}>
                  ⚙️ Thông tin cá nhân
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  🚪 Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="student-content">
        <div className="content-header">
          {activeTab === 'profile' ? (
            <h2>Thông tin cá nhân</h2>
          ) : activeTab === 'my-courses' ? (
            <h2>Khóa học của tôi</h2>
          ) : activeTab === 'pending' ? (
            <h2>Đang chờ duyệt</h2>
          ) : activeTab === 'favorites' ? (
            <h2>Yêu thích</h2>
          ) : (
            <h2>Khám phá khóa học</h2>
          )}
        </div>

        {/* Courses Grid */}
        <div className="courses-container">
          {activeTab === 'all' && (
            <div className="courses-grid">
              {courses.map((course) => {
                const isPurchased = course.students?.some(s => s._id === user?._id);
                const isPending = pendingCourseIds.includes(course._id);
                const isFavorited = favorites.includes(course._id);
                
                return (
                  <div key={course._id} className="course-card">
                    <div className="course-image-wrapper">
                      <img src={course.thumbnail} alt={course.title} />
                      <button 
                        className={`favorite-btn ${isFavorited ? 'active' : ''}`}
                        onClick={(e) => handleToggleFavorite(course._id, e)}
                        title={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
                      >
                        {isFavorited ? '❤️' : '🤍'}
                      </button>
                    </div>
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
                          <button className="btn-enrolled" disabled>✅ Đã tham gia</button>
                        ) : isPending ? (
                          <button className="btn-pending" onClick={() => navigate(`/student/checkout/${course._id}`)}>
                            ⏳ Đang chờ duyệt
                          </button>
                        ) : (
                          <button 
                            className="btn-enroll"
                            onClick={() => navigate(`/student/checkout/${course._id}`)}
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

          {activeTab === 'pending' && (
            <div className="courses-grid">
              {courses.filter(c => pendingCourseIds.includes(c._id)).length === 0 ? (
                <div className="empty-state">
                  <p>⏳ Bạn không có khóa học nào đang chờ xét duyệt</p>
                </div>
              ) : (
                courses.filter(c => pendingCourseIds.includes(c._id)).map((course) => (
                  <div key={course._id} className="course-card pending-card">
                    <img src={course.thumbnail} alt={course.title} />
                    <div className="course-content">
                      <h3>{course.title}</h3>
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <span>👨‍🏫 {course.instructor.name}</span>
                        <span>⭐ {course.rating}</span>
                      </div>
                      <button className="btn-pending" onClick={() => navigate(`/student/checkout/${course._id}`)}>
                        Xem thông tin thanh toán
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="courses-grid">
              {courses.filter(c => favorites.includes(c._id)).length === 0 ? (
                <div className="empty-state">
                  <p>❤️ Bạn chưa có khóa học yêu thích nào</p>
                  <button onClick={() => setActiveTab('all')} className="btn-browse">
                    Khám phá khóa học
                  </button>
                </div>
              ) : (
                courses.filter(c => favorites.includes(c._id)).map((course) => {
                  const isPurchased = course.students?.some(s => s._id === user?._id);
                  const isPending = pendingCourseIds.includes(course._id);
                  const isFavorited = true; // Obvious in this tab

                  return (
                    <div key={course._id} className="course-card">
                      <div className="course-image-wrapper">
                        <img src={course.thumbnail} alt={course.title} />
                        <button 
                          className={`favorite-btn ${isFavorited ? 'active' : ''}`}
                          onClick={(e) => handleToggleFavorite(course._id, e)}
                          title="Bỏ yêu thích"
                        >
                          ❤️
                        </button>
                      </div>
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
                            <button className="btn-enrolled" disabled>✅ Đã tham gia</button>
                          ) : isPending ? (
                            <button className="btn-pending" onClick={() => navigate(`/student/checkout/${course._id}`)}>
                              ⏳ Đang chờ duyệt
                            </button>
                          ) : (
                            <button 
                              className="btn-enroll"
                              onClick={() => navigate(`/student/checkout/${course._id}`)}
                            >
                              Đăng ký ngay
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
                      <button className="btn-continue" onClick={() => navigate(`/student/course/${course._id}`)}>▶️ Tiếp tục học</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-section" style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Cập nhật thông tin</h3>
              {profileMessage.text && (
                <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', background: profileMessage.type === 'error' ? '#fee2e2' : '#dcfce7', color: profileMessage.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${profileMessage.type === 'error' ? '#f87171' : '#86efac'}` }}>
                  {profileMessage.text}
                </div>
              )}
              <form onSubmit={handleProfileSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Họ và tên</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>Đổi mật khẩu (Tuỳ chọn)</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>Bỏ trống nếu bạn không muốn đổi mật khẩu</p>
                </div>

                {!user?.password && (
                  <div style={{ marginBottom: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    *Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mật khẩu mới</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={profileForm.newPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '0.75rem 2rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    Lưu Thay Đổi
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <StudentChatBubble />
    </div>
  );
}

export default StudentDashboard;
