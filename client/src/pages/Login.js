import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
        <h1>🎓 Admin Dashboard</h1>
        <p className="subtitle">Course Platform Management</p>

        {error && <div className="error-message">{error}</div>}

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
      </div>
    </div>
  );
}

export default Login;
