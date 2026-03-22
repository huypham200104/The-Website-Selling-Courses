import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/courses', icon: '📚', label: 'Quản lý khóa học' },
    { path: '/users', icon: '👥', label: 'Quản lý người dùng' },
    { path: '/orders', icon: '💰', label: 'Đơn hàng' },
  ];

  const instructorLinks = [
    { path: '/instructor/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/instructor/courses', icon: '📚', label: 'Khóa học của tôi' },
    { path: '/instructor/create-course', icon: '➕', label: 'Tạo khóa học' },
    { path: '/instructor/students', icon: '👨‍🎓', label: 'Học viên' },
    { path: '/instructor/chat', icon: '💬', label: 'Chat' },
  ];

  const links = user?.role === 'admin' ? adminLinks : instructorLinks;

  return (
    <div className="sidebar">
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
  );
}

export default Sidebar;
