import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, orderService } from '../services/apiService';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import './Checkout.css';

function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [previewVideoId, setPreviewVideoId] = useState(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState('');
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Build preview stream URL with JWT token in query param (supports range requests / seeking)
  useEffect(() => {
    if (!previewVideoId) return;
    const token = localStorage.getItem('token');
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const serverBase = apiBase.replace('/api', '');
    const url = `${serverBase}/api/videos/${previewVideoId}/preview-stream?token=${token}`;
    setVideoBlobUrl(url);
    setVideoLoading(false);
  }, [previewVideoId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch course details + preview video concurrently
      const [courseRes, previewRes] = await Promise.allSettled([
        courseService.getOne(courseId),
        courseService.getPreviewVideo(courseId),
      ]);

      if (courseRes.status === 'fulfilled') {
        const courseData = courseRes.value?.data;
        if (!courseData) throw new Error('Không tìm thấy khóa học');

        // Redirect if already purchased
        const alreadyIn = courseData.students?.some(
          (s) => s._id === courseData._id || typeof s === 'string'
        );
        setCourse(courseData);
      } else {
        throw courseRes.reason;
      }

      if (previewRes.status === 'fulfilled') {
        const vid = previewRes.value?.data;
        if (vid?._id) {
          setPreviewVideoId(vid._id);
          setPreviewVideoTitle(vid.title || 'Video giới thiệu');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Không thể tải thông tin thanh toán.';
      alert(msg);
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('File quá lớn, vui lòng chọn file dưới 5MB');
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleInputChange = (e) => handleFileChange(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Vui lòng tải lên ảnh chụp màn hình chuyển khoản trước khi xác nhận');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('courseId', courseId);
      formData.append('paymentMethod', 'chuyển khoản');

      const result = await orderService.submitWithProof(formData);

      if (result.alreadyPurchased) {
        alert('Bạn đã sở hữu khóa học này. Chuyển sang trang học.');
        navigate(`/student/course/${courseId}`);
        return;
      }

      alert('✅ Đã gửi yêu cầu thanh toán thành công!\n\nĐơn hàng đang chờ Admin duyệt. Bạn sẽ được thông báo khi được phê duyệt.');
      navigate('/student/dashboard?tab=pending');
    } catch (error) {
      console.error('Error submitting order:', error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Có lỗi xảy ra khi tải lên minh chứng. Vui lòng thử lại.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="checkout-loading"><div className="checkout-spinner" /><p>Đang tải thông tin...</p></div>;
  if (!course) return <div className="error-message">Không tìm thấy thông tin khóa học.</div>;

  // VietQR config
  const bankName = 'BIDV';
  const accNo = '1351446432';
  const accName = 'PHAM NGOC HUY';
  const amount = course.price;
  // Use courseId as transfer content so admin can verify
  const addInfo = `DK-${courseId.slice(-8).toUpperCase()}`;
  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accNo}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accName)}`;

  // Build stream URL already handled via videoBlobUrl (authenticated fetch)
  return (
    <>
      <StudentHeader />
      <div className="checkout-page">
        <div className="checkout-container">

          {/* Header */}
          <div className="checkout-header">
            <div className="checkout-header-icon">🎓</div>
            <h2>Đăng ký khóa học</h2>
            <p>Hoàn tất thanh toán để bắt đầu học ngay!</p>
          </div>

          {/* Video Preview Section */}
          {previewVideoId && (
            <div className="checkout-preview-section">
              <div className="preview-badge">
                <span>▶</span> Xem thử miễn phí
              </div>
              <h3 className="preview-title">{previewVideoTitle}</h3>
              <div className="preview-video-wrapper">
                {videoLoading ? (
                  <div className="video-loading-placeholder">
                    <div className="checkout-spinner" />
                    <p>Đang tải video xem thử...</p>
                  </div>
                ) : videoBlobUrl ? (
                  <video
                    controls
                    controlsList="nodownload"
                    className="preview-video"
                    src={videoBlobUrl}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    Trình duyệt của bạn không hỗ trợ phát video.
                  </video>
                ) : (
                  <div className="video-loading-placeholder">
                    <p>⚠️ Không thể tải video xem thử</p>
                  </div>
                )}
              </div>
              <p className="preview-hint">
                💡 Đây là video đầu tiên của khóa học. Đăng ký để xem toàn bộ nội dung!
              </p>
            </div>
          )}

          {/* Main Content */}
          <div className="checkout-content">
            {/* Left: Course info + Bank info */}
            <div className="checkout-left">
              <div className="course-info-card">
                <h3>📚 Thông tin khóa học</h3>
                <div className="course-info-body">
                  <img src={course.thumbnail} alt={course.title} className="course-thumb" />
                  <div className="course-info-details">
                    <h4>{course.title}</h4>
                    <p className="course-meta-line">👨‍🏫 {course.instructor?.name || 'Giảng viên'}</p>
                    <p className="course-meta-line">🎬 {course.videos?.length || 0} video bài học</p>
                    <p className="course-meta-line">⭐ {course.rating || '5.0'} / 5.0</p>
                    <div className="course-price-tag">{formatCurrency(course.price)}</div>
                  </div>
                </div>
              </div>

              <div className="transfer-info-card">
                <h3>💳 Thông tin chuyển khoản</h3>
                <div className="transfer-content">
                  <div className="transfer-qr">
                    <img src={qrUrl} alt="VietQR mã thanh toán" className="qr-image" />
                    <p className="qr-hint">Quét mã để chuyển khoản nhanh</p>
                  </div>
                  <div className="transfer-details">
                    <div className="transfer-row">
                      <span className="transfer-label">Ngân hàng</span>
                      <span className="transfer-value bank-name">{bankName}</span>
                    </div>
                    <div className="transfer-row">
                      <span className="transfer-label">Số tài khoản</span>
                      <span className="transfer-value account-no">{accNo}</span>
                    </div>
                    <div className="transfer-row">
                      <span className="transfer-label">Tên tài khoản</span>
                      <span className="transfer-value">{accName}</span>
                    </div>
                    <div className="transfer-row">
                      <span className="transfer-label">Số tiền</span>
                      <span className="transfer-value amount-value">{formatCurrency(amount)}</span>
                    </div>
                    <div className="transfer-row highlight-row">
                      <span className="transfer-label">Nội dung CK</span>
                      <span className="transfer-value content-code">{addInfo}</span>
                    </div>
                    <p className="transfer-note">
                      ⚠️ Vui lòng ghi đúng nội dung chuyển khoản <strong>{addInfo}</strong> để Admin duyệt nhanh nhất
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Upload proof + Confirm */}
            <div className="checkout-right">
              <form onSubmit={handleSubmit} className="proof-form">
                <div className="proof-form-header">
                  <div className="proof-steps">
                    <div className="step done">
                      <span className="step-num">1</span>
                      <span className="step-text">Chuyển khoản theo thông tin</span>
                    </div>
                    <div className={`step ${file ? 'done' : 'active'}`}>
                      <span className="step-num">2</span>
                      <span className="step-text">Tải ảnh biên lai lên</span>
                    </div>
                    <div className={`step ${file ? 'active' : ''}`}>
                      <span className="step-num">3</span>
                      <span className="step-text">Bấm xác nhận & chờ duyệt</span>
                    </div>
                  </div>
                </div>

                <h3 className="proof-title">📸 Tải lên biên lai chuyển khoản</h3>
                <p className="proof-desc">
                  Sau khi chuyển khoản, chụp màn hình biên lai và tải lên bên dưới.
                  Admin sẽ xét duyệt trong vòng 24 giờ.
                </p>

                {/* Drop zone */}
                <div
                  className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <div className="file-preview">
                      <img src={previewUrl} alt="Biên lai" className="receipt-preview-img" />
                      <div className="file-preview-overlay">
                        <span>🔄 Nhấn để thay đổi</span>
                      </div>
                    </div>
                  ) : (
                    <div className="drop-zone-placeholder">
                      <div className="upload-icon">📤</div>
                      <p className="upload-main-text">Kéo thả ảnh vào đây</p>
                      <p className="upload-sub-text">hoặc nhấn để chọn file</p>
                      <p className="upload-format-text">JPG, PNG, WEBP · tối đa 5MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {file && (
                  <div className="file-info">
                    ✅ <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(''); }}
                    >✕</button>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={!file || isSubmitting}
                >
                  {isSubmitting ? (
                    <><span className="btn-spinner" /> Đang gửi...</>
                  ) : (
                    <>✅ Xác nhận đã chuyển khoản</>
                  )}
                </button>

                <p className="confirm-note">
                  Đơn hàng sẽ được tạo ở trạng thái <strong>Chờ Admin duyệt</strong> sau khi bạn xác nhận.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Checkout;
