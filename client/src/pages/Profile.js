import React from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import './Profile.css';

function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <div className="profile-container">
          <p>Đang tải thông tin người dùng...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="profile-page">
        <div className="profile-header">
          <h1>👤 Hồ sơ cá nhân</h1>
          <p className="subtitle">Thông tin tài khoản của bạn</p>
        </div>

        <div className="profile-card">
          <div className="profile-avatar-section">
            <img 
              src={user.avatar || 'https://via.placeholder.com/150'} 
              alt={user.name} 
              className="profile-avatar-large"
            />
            <div className={`role-badge role-${user.role}`}>
              {user.role.toUpperCase()}
            </div>
          </div>

          <div className="profile-info-section">
            <div className="info-group">
              <label>Họ và tên</label>
              <p className="info-value">{user.name}</p>
            </div>
            <div className="info-group">
              <label>Email</label>
              <p className="info-value">{user.email}</p>
            </div>
            <div className="info-group">
              <label>Ngày gia nhập</label>
              <p className="info-value">
                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <a href="/settings" className="btn-secondary">⚙️ Cài đặt tài khoản</a>
        </div>
      </div>
    </Layout>
  );
}

export default Profile;
