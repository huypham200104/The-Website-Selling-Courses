import React, { useState } from 'react';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import './Settings.css';

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới tối thiểu 6 ký tự.' });
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Đổi mật khẩu thất bại. Kiểm tra mật khẩu hiện tại.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="settings-page">
        <h1>⚙️ Cài đặt</h1>
        <section className="settings-section">
          <h2>Đổi mật khẩu</h2>
          <p className="settings-desc">Đổi mật khẩu đăng nhập cho tài khoản admin của bạn.</p>
          <form onSubmit={handleSubmit} className="settings-form">
            {message.text && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}
            <div className="form-group">
              <label>Mật khẩu hiện tại *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu mới *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label>Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}

export default Settings;
