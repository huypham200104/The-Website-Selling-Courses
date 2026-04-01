import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const adminLinks = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/courses', icon: '📚', label: 'Quản lý khóa học' },
    { path: '/users', icon: '👥', label: 'Quản lý người dùng' },
    { path: '/orders', icon: '💰', label: 'Đơn hàng' },
    { path: '/reports', icon: '🚩', label: 'Báo cáo khóa học' },
    { path: '/chat', icon: '💬', label: 'Tin nhắn' },
  ];

  const instructorLinks = [
    { path: '/instructor/courses', icon: '📚', label: 'Khóa học của tôi' },
    // Create-course hidden for instructors; admin handles creation
    { path: '/instructor/students', icon: '👨‍🎓', label: 'Học viên' },
    { path: '/instructor/chat', icon: '💬', label: 'Tin nhắn' },
    { path: '/instructor/profile', icon: '⚙️', label: 'Thông tin cá nhân' },
  ];


  const links = user?.role === 'admin' ? adminLinks : instructorLinks;

  return (
    <>
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <span className="hamburger-icon">{isOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🎓 Course Platform</h2>
          <p className="user-info">
            <span className="user-role">{user?.role === 'admin' ? '👨‍💼 Admin' : '👨‍🏫 Instructor'}</span>
            <span className="user-name">{user?.name}</span>
          </p>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={closeSidebar}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
