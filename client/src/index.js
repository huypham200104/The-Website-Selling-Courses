/**
 * Cổng vào của ứng dụng React (Frontend).
 * Lưu ý: Các logic về Express/Passport được xử lý tại thư mục /server.
 * Xem /client/src/pages/Profile.js để thấy trang Hồ sơ cá nhân tương tự đoạn code bạn yêu cầu.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
