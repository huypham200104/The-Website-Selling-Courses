import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, orderService, authService } from '../services/apiService';
import { useLanguage } from '../context/LanguageContext';
import '../pages/StudentDashboard.css'; // Reusing existing header styles

function StudentHeader({ customActiveTab, onTabChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  
  const [counts, setCounts] = useState({
    pending: 0,
    favorites: 0,
    myCourses: 0,
    orders: 0
  });

  // Determine active tab
  const urlTab = searchParams.get('tab');
  const activeTab = customActiveTab || urlTab || 'all';

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        // Fallback context user
        const userData = currentUser || user;
        
        let favCount = 0;
        if (userData && userData.favorites) {
          favCount = userData.favorites.length;
        }

        const [coursesRes, ordersRes, summaryRes] = await Promise.all([
          courseService.getAll(),
          orderService.getAll(),
          orderService.getSummary()
        ]);
        
        const allCourses = coursesRes.data || [];
        const allOrders = ordersRes.data || [];
        const summaryData = summaryRes?.data || {};
        
        const purchased = (summaryData.courses && summaryData.courses.length > 0)
          ? summaryData.courses
          : allCourses.filter(course => course.students?.some(s => s._id === userData?._id));
        
        const pendingIds = allOrders
          .filter(order => order.status === 'pending')
          .map(order => order.courseId?._id || order.courseId)
          .filter(id => id && allCourses.some(c => c._id === id));
        
        const uniquePending = [...new Set(pendingIds)];

        setCounts({
          pending: uniquePending.length,
          favorites: favCount,
          myCourses: purchased.length,
          orders: summaryData.orders?.length || 0
        });
      } catch (error) {
        console.error('Error fetching global counts for header:', error);
      }
    };
    
    if (user) {
      fetchCounts();
    }
  }, [user]);

  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      if (location.pathname === '/student/dashboard') {
        setSearchParams({ tab });
      } else {
        navigate(`/student/dashboard?tab=${tab}`);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const logoClick = () => {
    if (location.pathname === '/student/dashboard') {
      setSearchParams({ tab: 'all' });
      if (onTabChange) onTabChange('all');
    } else {
      navigate('/student/dashboard?tab=all');
    }
  };

  return (
    <header className="student-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo" onClick={logoClick} style={{ cursor: 'pointer' }}>
            <h1>{t('student.header.title')}</h1>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-link ${activeTab === 'all' && location.pathname === '/student/dashboard' ? 'active' : ''}`}
              onClick={() => handleTabClick('all')}
            >
              {t('student.header.tabs.all')}
            </button>
            <button
              className={`nav-link ${activeTab === 'pending' && location.pathname === '/student/dashboard' ? 'active' : ''}`}
              onClick={() => handleTabClick('pending')}
            >
              {t('student.header.tabs.pending', { count: counts.pending })}
            </button>
            <button
              className={`nav-link ${activeTab === 'favorites' && location.pathname === '/student/dashboard' ? 'active' : ''}`}
              onClick={() => handleTabClick('favorites')}
            >
              {t('student.header.tabs.favorites', { count: counts.favorites })}
            </button>
            <button
              className={`nav-link ${activeTab === 'orders' && location.pathname === '/student/dashboard' ? 'active' : ''}`}
              onClick={() => handleTabClick('orders')}
            >
              Đơn hàng ({counts.orders})
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="language-switcher" role="group" aria-label={t('language.switcher.label')}>
            <button
              type="button"
              className={`language-btn ${language === 'vi' ? 'active' : ''}`}
              onClick={() => setLanguage('vi')}
            >
              {t('language.switcher.vi')}
            </button>
            <button
              type="button"
              className={`language-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              {t('language.switcher.en')}
            </button>
          </div>
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
              
              <button 
                className={`dropdown-item ${activeTab === 'my-courses' && location.pathname === '/student/dashboard' ? 'active-dropdown' : ''}`} 
                onClick={() => handleTabClick('my-courses')}
              >
                {t('student.header.menu.myCourses', { count: counts.myCourses })}
              </button>
              <button 
                className={`dropdown-item ${activeTab === 'orders' && location.pathname === '/student/dashboard' ? 'active-dropdown' : ''}`} 
                onClick={() => handleTabClick('orders')}
              >
                Đơn hàng của tôi
              </button>
              <button 
                className={`dropdown-item ${activeTab === 'profile' && location.pathname === '/student/dashboard' ? 'active-dropdown' : ''}`} 
                onClick={() => handleTabClick('profile')}
              >
                {t('student.header.menu.profile')}
              </button>
              <button 
                className={`dropdown-item ${location.pathname === '/student/quiz-results' ? 'active-dropdown' : ''}`} 
                onClick={() => navigate('/student/quiz-results')}
              >
                {t('student.header.menu.quizResults')}
              </button>
              <button 
                className={`dropdown-item ${location.pathname === '/student/chat' ? 'active-dropdown' : ''}`} 
                onClick={() => navigate('/student/chat')}
              >
                {t('student.header.menu.chat')}
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                {t('student.header.menu.logout')}
              </button>

            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default StudentHeader;
