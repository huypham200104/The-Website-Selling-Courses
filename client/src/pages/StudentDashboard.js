import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, orderService, authService } from '../services/apiService';
import StudentHeader from '../components/StudentHeader';
import StudentChatBubble from '../components/StudentChatBubble';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import './StudentDashboard.css';

function StudentDashboard() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [pendingCourseIds, setPendingCourseIds] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all'; // 'all', 'my-courses', 'pending', 'favorites', 'profile'
  
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

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
      setProfileMessage({ text: t('student.dashboard.profile.passwordMismatch'), type: 'error' });
      return;
    }

    try {
      const response = await authService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      });
      
      setProfileMessage({ text: response.message || t('student.dashboard.profile.success'), type: 'success' });
      
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

  const getHeadingKey = () => {
    if (activeTab === 'profile') return 'student.dashboard.heading.profile';
    if (activeTab === 'my-courses') return 'student.dashboard.heading.myCourses';
    if (activeTab === 'pending') return 'student.dashboard.heading.pending';
    if (activeTab === 'favorites') return 'student.dashboard.heading.favorites';
    return 'student.dashboard.heading.discover';
  };

  if (loading) {
    return <div className="loading">{t('student.dashboard.loading')}</div>;
  }

  return (
    <div className="student-dashboard">
      <StudentHeader customActiveTab={activeTab} onTabChange={setActiveTab} />


      {/* Main Content */}
      <div className="student-content">
        <div className="content-header">
          <h2>{t(getHeadingKey())}</h2>
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
                        title={isFavorited ? t('student.dashboard.favorites.remove') : t('student.dashboard.favorites.add')}
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
                      {isPurchased ? (
                        <div style={{ marginTop: '15px' }}>
                          <button 
                            className="btn-continue" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/course/${course._id}`);
                            }}
                          >
                            {t('student.dashboard.buttons.continue')}
                          </button>
                        </div>
                      ) : (
                        <div className="course-footer">
                          <span className="price">{formatCurrency(course.price)}</span>
                          {isPending ? (
                            <button className="btn-pending" onClick={() => navigate(`/student/checkout/${course._id}`)}>
                              {t('student.dashboard.buttons.pending')}
                            </button>
                          ) : (
                            <button 
                              className="btn-enroll"
                              onClick={() => navigate(`/student/checkout/${course._id}`)}
                            >
                              {t('student.dashboard.buttons.enroll')}
                            </button>
                          )}
                        </div>
                      )}
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
                  <p>{t('student.dashboard.empty.pending')}</p>
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
                        {t('student.dashboard.buttons.viewPayment')}
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
                  <p>{t('student.dashboard.empty.favorites')}</p>
                  <button onClick={() => setActiveTab('all')} className="btn-browse">
                    {t('student.dashboard.buttons.browse')}
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
                          title={t('student.dashboard.favorites.remove')}
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
                        {isPurchased ? (
                          <div style={{ marginTop: '15px' }}>
                            <button 
                              className="btn-continue"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/student/course/${course._id}`);
                              }}
                            >
                              {t('student.dashboard.buttons.continue')}
                            </button>
                          </div>
                        ) : (
                          <div className="course-footer">
                            <span className="price">{formatCurrency(course.price)}</span>
                            {isPending ? (
                              <button className="btn-pending" onClick={() => navigate(`/student/checkout/${course._id}`)}>
                                {t('student.dashboard.buttons.pending')}
                              </button>
                            ) : (
                              <button 
                                className="btn-enroll"
                                onClick={() => navigate(`/student/checkout/${course._id}`)}
                              >
                                {t('student.dashboard.buttons.enroll')}
                              </button>
                            )}
                          </div>
                        )}
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
                  <p>{t('student.dashboard.empty.myCourses')}</p>
                  <button onClick={() => setActiveTab('all')} className="btn-browse">
                    {t('student.dashboard.buttons.browse')}
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
                      <button className="btn-continue" onClick={() => navigate(`/student/course/${course._id}`)}>{t('student.dashboard.buttons.continue')}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-section" style={{ maxWidth: '600px', margin: '0 auto', background: '#ffffff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>{t('student.dashboard.profile.title')}</h3>
              {profileMessage.text && (
                <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', background: profileMessage.type === 'error' ? '#fee2e2' : '#dcfce7', color: profileMessage.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${profileMessage.type === 'error' ? '#f87171' : '#86efac'}` }}>
                  {profileMessage.text}
                </div>
              )}
              <form onSubmit={handleProfileSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e293b' }}>{t('student.dashboard.profile.name')}</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e293b' }}>{t('student.dashboard.profile.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    readOnly
                    title={t('student.dashboard.profile.emailTooltip')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>

                <div style={{ marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: '#1e293b' }}>{t('student.dashboard.profile.passwordSectionTitle')}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0' }}>{t('student.dashboard.profile.passwordHint')}</p>
                </div>

                {!user?.password && (
                  <div style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                    {t('student.dashboard.profile.googleNote')}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e293b' }}>{t('student.dashboard.profile.currentPassword')}</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e293b' }}>{t('student.dashboard.profile.newPassword')}</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={profileForm.newPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
                  />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e293b' }}>{t('student.dashboard.profile.confirmPassword')}</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {t('student.dashboard.profile.submit')}
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
