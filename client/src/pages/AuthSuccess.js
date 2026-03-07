import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Thiếu token.');
      return;
    }
    let cancelled = false;
    loginWithToken(token)
      .then((user) => {
        if (cancelled) return;
        if (user?.role === 'admin') navigate('/dashboard', { replace: true });
        else if (user?.role === 'instructor') navigate('/instructor/dashboard', { replace: true });
        else navigate('/student/dashboard', { replace: true });
      })
      .catch(() => {
        if (!cancelled) setError('Đăng nhập thất bại. Vui lòng thử lại.');
      });
    return () => { cancelled = true; };
  }, [searchParams, loginWithToken, navigate]);

  if (error) {
    return (
      <div className="login-container" style={{ flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
        <a href="/login" className="btn-primary">Quay lại đăng nhập</a>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ flexDirection: 'column' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Đang chuyển hướng...</p>
    </div>
  );
}

export default AuthSuccess;
