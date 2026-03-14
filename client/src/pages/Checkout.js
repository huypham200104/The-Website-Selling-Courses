import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, orderService } from '../services/apiService';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import './Checkout.css';

function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch course details
      const courseRes = await courseService.getOne(courseId);
      setCourse(courseRes.data);

      // 2. Create or get pending order
      const orderRes = await orderService.create(courseId, 'chuyển khoản');
      setOrder(orderRes.data);
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Không thể tải thông tin thanh toán.');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File quá lớn, vui lòng chọn file dưới 5MB');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Vui lòng tải lên ảnh chụp màn hình chuyển khoản');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('receipt', file);

      await orderService.uploadProof(order._id, formData);
      
      alert('Đã gửi thông tin thanh toán! Vui lòng chờ Admin duyệt để vào học.');
      navigate('/student/dashboard');
      
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Có lỗi xảy ra khi tải lên minh chứng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) return <div className="loading">Đang tải thông tin...</div>;
  if (!course || !order) return <div className="error-message">Không tìm thấy thông tin khóa học / đơn hàng.</div>;

  // VietQR Config provided by user
  const bankBin = '970415'; // VietinBank bin code internally (or use 'vietinbank' but standard is usually BIN or short name for certain APIs)
  // Or direct short name used in API img.vietqr.io
  const bankName = 'BIDV';
  const accNo = '1351446432';
  const accName = 'PHAM NGOC HUY';
  // Use current order id as transfer content
  const addInfo = order._id;
  const amount = course.price;
  
  // Create URL for VietQR
  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accNo}-compact2.jpg?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(accName)}`;

  return (
    <>
      <StudentHeader />
      <div className="checkout-page">
        <div className="checkout-container">
          
          <div className="checkout-header">
          <h2>Thanh toán khóa học</h2>
          <p>Hoàn tất thanh toán để bắt đầu học ngay!</p>
        </div>

        <div className="checkout-content">
          {/* Left Column: Course & Order info */}
          <div className="course-summary">
            <h3>Thông tin khóa học</h3>
            <div className="summary-card">
              <img src={course.thumbnail} alt={course.title} className="summary-thumb" />
              <div className="summary-details">
                <h4>{course.title}</h4>
                <p>👨‍🏫 Giảng viên: {course.instructor?.name}</p>
                <p className="price">Học phí: {formatCurrency(course.price)}</p>
              </div>
            </div>

            <div className="order-info">
              <h3>Mã Đơn Hàng Của Bạn</h3>
              <div className="order-id-box">
                <code>{order._id}</code>
              </div>
              <p className="note">Vui lòng ghi đúng nội dung chuyển khoản là mã đơn hàng này để hệ thống duyệt tự động/nhanh nhất.</p>
            </div>
          </div>

          {/* Right Column: Payment & Proof */}
          <div className="payment-section">
            <h3>Chuyển khoản qua quét mã QR</h3>
            <div className="qr-container">
              <img src={qrUrl} alt="VietQR mã thanh toán" className="qr-image" />
            </div>
            
            <div className="manual-transfer-info">
              <p><strong>Ngân hàng:</strong> {bankName}</p>
              <p><strong>Số tài khoản:</strong> {accNo}</p>
              <p><strong>Tên tài khoản:</strong> {accName}</p>
              <p><strong>Số tiền:</strong> {formatCurrency(amount)}</p>
              <p><strong>Nội dung:</strong> <code>{addInfo}</code></p>
            </div>

            <form onSubmit={handleSubmit} className="proof-upload-form">
              <h3>Tải lên biên lai chuyển khoản</h3>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  id="receipt" 
                  accept="image/jpeg,image/png,image/jpg,image/webp" 
                  onChange={handleFileChange}
                />
                <label htmlFor="receipt" className="btn-choose-file">
                  📷 Chọn ảnh biên lai...
                </label>
              </div>

              {previewUrl && (
                <div className="preview-container">
                  <p>Ảnh đã chọn:</p>
                  <img src={previewUrl} alt="Preview" className="img-preview" />
                </div>
              )}

              <button 
                type="submit" 
                className="btn-submit-proof" 
                disabled={!file || isSubmitting}
              >
                {isSubmitting ? 'Đang gửi...' : 'Xác nhận đã chuyển khoản'}
              </button>
            </form>
          </div>

        </div>
      </div>
      <Footer />
    </div>
    </>
  );
}

export default Checkout;
