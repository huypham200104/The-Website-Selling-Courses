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
    console.log('[AuthSuccess] mounted. token from URL:', token ? token.substring(0, 20) + '...' : 'MISSING');

    if (!token) {
      console.log('[AuthSuccess] ❌ No token in URL params!');
      setError('Thiếu token.');
      return;
    }
    let cancelled = false;
    loginWithToken(token)
      .then((user) => {
        console.log('[AuthSuccess] loginWithToken success, user:', user);
        if (cancelled) {
          console.log('[AuthSuccess] cancelled, skipping navigate');
          return;
        }
        if (user?.role === 'admin') {
          console.log('[AuthSuccess] navigating to /dashboard');
          navigate('/dashboard', { replace: true });
        } else if (user?.role === 'instructor') {
          console.log('[AuthSuccess] navigating to /instructor/dashboard');
          navigate('/instructor/dashboard', { replace: true });
        } else {
          console.log('[AuthSuccess] navigating to /student/dashboard, role:', user?.role);
          navigate('/student/dashboard', { replace: true });
        }
      })
      .catch((err) => {
        console.error('[AuthSuccess] loginWithToken FAILED:', err);
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
