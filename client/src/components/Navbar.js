import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>🎓 Admin Panel</h2>
      </div>

      <div className="navbar-menu">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          📊 Dashboard
        </NavLink>
        <NavLink to="/courses" className={({ isActive }) => isActive ? 'active' : ''}>
          📚 Courses
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>
          💰 Orders
        </NavLink>
      </div>

      <div className="navbar-user">
        <span className="user-name">👋 {user?.name || 'Admin'}</span>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
