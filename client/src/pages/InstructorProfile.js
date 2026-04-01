import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import './InstructorProfile.css';

function InstructorProfile() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'password'
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    messengerLink: '',
    facebookUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        messengerLink: user.messengerLink || '',
        facebookUrl: user.facebookUrl || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear message when user types
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleUpdateBasicInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const normalizeLink = (value) => {
        if (!value) return '';
        const trimmed = value.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      };

      const updateData = {
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar,
        messengerLink: normalizeLink(formData.messengerLink),
        facebookUrl: normalizeLink(formData.facebookUrl)
      };

      const response = await authAPI.updateProfile(updateData);
      
      // Update user context
      setUser(response.data.user);
      
      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...response.data.user }));

      setMessage({ type: 'success', text: 'Cập nhật thông tin cơ bản thành công!' });

    } catch (error) {
      console.error('Update profile error:', error);
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate password fields
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại' });
        setLoading(false);
        return;
      }

      if (!formData.newPassword) {
        setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu mới' });
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' });
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        setLoading(false);
        return;
      }

      const updateData = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      };

      await authAPI.updateProfile(updateData);

      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error) {
      console.error('Update password error:', error);
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="instructor-profile">
        <div className="profile-header">
          <h1>⚙️ Thông tin cá nhân</h1>
          <p>Quản lý thông tin tài khoản của bạn</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="avatar-preview">
              {formData.avatar || user?.avatar ? (
                <img src={formData.avatar || user?.avatar} alt="Avatar" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} />
              ) : null}
              <div className="avatar-placeholder" style={{ display: (formData.avatar || user?.avatar) ? 'none' : 'flex' }}>
                {user?.name?.charAt(0).toUpperCase() || '👤'}
              </div>
            </div>
            <div className="avatar-info">
              <h3>{user?.name}</h3>
              <p className="role-badge">{user?.role === 'instructor' ? '👨‍🏫 Giảng viên' : user?.role === 'admin' ? '👨‍💼 Admin' : '👤 User'}</p>
              <p className="email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-tabs">
            <button 
              className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => { setActiveTab('basic'); setMessage({ type: '', text: '' }); }}
            >
              📝 Thông tin cơ bản
            </button>
            <button 
              className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => { setActiveTab('password'); setMessage({ type: '', text: '' }); }}
            >
              🔐 Đổi mật khẩu
            </button>
          </div>

          {activeTab === 'basic' ? (
            <form onSubmit={handleUpdateBasicInfo} className="profile-form">
              <div className="form-section">
                <h2>📝 Thông tin cơ bản</h2>
                
                <div className="form-group">
                  <label htmlFor="name">Họ và tên *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    title="Email không thể thay đổi"
                    style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="avatar">Avatar URL (tùy chọn)</label>
                  <input
                    type="text"
                    id="avatar"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <small>Nhập URL hình ảnh avatar của bạn</small>
                </div>

                <div className="form-group">
                  <label htmlFor="messengerLink">Liên kết Messenger</label>
                  <input
                    type="url"
                    id="messengerLink"
                    name="messengerLink"
                    value={formData.messengerLink}
                    onChange={handleChange}
                    placeholder="https://m.me/ten-nguoi-dung"
                  />
                  <small>Học viên sẽ mở liên hệ này từ màn hình chat</small>
                </div>

                <div className="form-group">
                  <label htmlFor="facebookUrl">Liên kết Facebook (dự phòng)</label>
                  <input
                    type="url"
                    id="facebookUrl"
                    name="facebookUrl"
                    value={formData.facebookUrl}
                    onChange={handleChange}
                    placeholder="https://facebook.com/ten-nguoi-dung"
                  />
                  <small>Dùng khi không có Messenger link hoặc muốn hiển thị cả hai</small>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? '⏳ Đang lưu...' : '💾 Cập nhật thông tin'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="profile-form">
              <div className="form-section">
                <h2>🔐 Đổi mật khẩu</h2>
                <p className="section-description">
                  Nhập mật khẩu hiện tại và mật khẩu mới để thay đổi
                </p>

                <div className="form-group">
                  <label htmlFor="currentPassword">Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Mật khẩu mới *</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? '⏳ Đang lưu...' : '🔑 Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default InstructorProfile;
