import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-section about">
          <h3>🎓 Course Platform</h3>
          <p>
            Nền tảng học trực tuyến hàng đầu, cung cấp các khóa học chất lượng cao từ các chuyên gia trong ngành. Cập nhật kiến thức mới mỗi ngày.
          </p>
          <div className="social-links">
            <a href="#" className="social-icon">📘 Facebook</a>
            <a href="#" className="social-icon">▶️ YouTube</a>
            <a href="#" className="social-icon">🐦 Twitter</a>
          </div>
        </div>
        <div className="footer-section links">
          <h4>Khám Phá</h4>
          <ul>
            <li><a href="#">Về chúng tôi</a></li>
            <li><a href="#">Khóa học phổ biến</a></li>
            <li><a href="#">Quy định chung</a></li>
            <li><a href="#">Chính sách bảo mật</a></li>
          </ul>
        </div>
        <div className="footer-section contact">
          <h4>Liên Hệ</h4>
          <ul>
            <li>📍 Địa chỉ: 123 Đường Học Tập, Quận 1, TP. HCM</li>
            <li>📞 Số điện thoại: 032855932</li>
            <li>✉️ Email: ngochuy200104@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Course Platform. All rights reserved. Designed with ❤️ by Group Nhựt, Tỷ, Vinh.</p>
      </div>
    </footer>
  );
}

export default Footer;
