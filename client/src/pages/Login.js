import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || err.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Vui lòng nhập đầy đủ tên, email, mật khẩu');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password });
      const token = res.data?.token;
      if (token) {
        await loginWithToken(token);
        navigate('/dashboard');
      } else {
        // Fallback: login via credentials
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Register error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const quickLogin = (role) => {
    const credentials = {
      admin: { email: 'admin@example.com', password: 'admin123' },
      instructor: { email: 'instructor@example.com', password: 'instructor123' },
      student: { email: 'student1@example.com', password: 'student123' }
    };

    const cred = credentials[role];
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{authMode === 'login' ? '🎓 Admin Dashboard' : '👨‍🎓 Đăng ký học viên'}</h1>
        <p className="subtitle">
          {authMode === 'login' ? 'Course Platform Management' : 'Chỉ đăng ký role Student. Giảng viên do admin cấp.'}
        </p>

        {error && <div className="error-message">{error}</div>}

        {authMode === 'login' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="name">Họ tên</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Nhập lại mật khẩu</label>
              <input
                type="password"
                id="confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Đang đăng ký...' : 'Đăng ký học viên'}
            </button>
          </form>
        )}

        {authMode === 'login' && (
          <>
            <div className="divider">
              <span>hoặc</span>
            </div>

            <button
              id="google-login-btn"
              className="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              type="button"
            >
              <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Đăng nhập bằng Google
            </button>

            <div className="quick-login-section">
              <p className="quick-login-title">⚡ Quick Login:</p>
              <div className="quick-login-buttons">
                <button 
                  type="button" 
                  className="quick-btn admin-btn"
                  onClick={() => quickLogin('admin')}
                  disabled={loading}
                >
                  👨‍💼 Admin
                </button>
                <button 
                  type="button" 
                  className="quick-btn instructor-btn"
                  onClick={() => quickLogin('instructor')}
                  disabled={loading}
                >
                  👨‍🏫 Instructor
                </button>
                <button 
                  type="button" 
                  className="quick-btn student-btn"
                  onClick={() => quickLogin('student')}
                  disabled={loading}
                >
                  👨‍🎓 Student
                </button>
              </div>
            </div>

            <div className="demo-credentials">
              <p>📝 Demo Credentials:</p>
              <p><strong>Admin:</strong> admin@example.com / admin123</p>
              <p><strong>Instructor:</strong> instructor@example.com / instructor123</p>
              <p><strong>Student:</strong> student1@example.com / student123</p>
            </div>
          </>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {authMode === 'login' ? (
            <button type="button" className="link-btn" onClick={() => { setAuthMode('register'); setError(''); }} disabled={loading}>
              Chưa có tài khoản? Đăng ký học viên
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => { setAuthMode('login'); setError(''); }} disabled={loading}>
              Đã có tài khoản? Đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
