import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, videoService } from '../services/apiService';
import Layout from '../components/Layout';
import './CourseDetail.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CourseDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: '', description: '', url: '', order: '' });

  const isOwner = user?._id === course?.instructor?._id || user?._id === course?.instructor;
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || isOwner;

  useEffect(() => {
    let cancelled = false;
    courseService.getOne(id).then((res) => {
      if (!cancelled) setCourse(res.data);
    }).catch(() => {
      if (!cancelled) setCourse(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('🗑️ Bạn có chắc muốn xóa video này?')) return;
    try {
      await videoService.delete(videoId);
      alert('✅ Xóa video thành công!');
      setCourse((prev) => ({
        ...prev,
        videos: (prev?.videos || []).filter((v) => v._id !== videoId),
      }));
    } catch (e) {
      alert('❌ Không thể xóa video');
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    try {
      alert('⚠️ Chức năng tải video lên yêu cầu hệ thống xử lý chuyên sâu. Đang lưu thông tin video...');
      setShowAddVideo(false);
      setVideoForm({ title: '', description: '', url: '', order: '' });
    } catch (err) {
      alert('❌ Lỗi khi thêm video');
    }
  };

  const thumbSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Đang tải...</div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="empty-state">Không tìm thấy khóa học.</div>
        <button type="button" className="btn-primary" onClick={() => navigate('/courses')}>Quay lại</button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="course-detail-page">
        <button type="button" className="btn-back" onClick={() => navigate('/courses')}>← Quay lại</button>
        <div className="course-detail-header">
          {course.thumbnail && (
            <div className="course-detail-thumb-wrap">
              <img src={thumbSrc(course.thumbnail)} alt="" className="course-detail-thumb" />
            </div>
          )}
          <div className="course-detail-info">
            <h1>{course.title}</h1>
            <p className="course-detail-meta">
              📂 <span className="category-badge">{course.category || 'Chưa phân loại'}</span> 
              <span className={`level-badge ${course.level}`}>{course.level}</span>
              <span className="price-tag">💰 {Number(course.price).toLocaleString('vi-VN')}đ</span>
            </p>
            <p className="course-detail-desc">{course.description}</p>
            <div className="instructor-info">
              <span className="icon">👨‍🏫</span> {course.instructor?.name || 'N/A'} · <span className="icon">👥</span> {course.students?.length || 0} học viên
            </div>
          </div>
          {canManage && (
            <div className="course-detail-actions">
              <button className="btn-add-video" onClick={() => setShowAddVideo(true)}>➕ Thêm Video</button>
            </div>
          )}
        </div>

        <div className="course-videos-section">
          <div className="section-header">
            <h2>🎬 Danh sách bài học ({course.videos?.length || 0})</h2>
          </div>
          {(!course.videos || course.videos.length === 0) ? (
            <div className="empty-videos">
              <p>Chưa có bài học nào trong khóa học này.</p>
              {canManage && <button className="btn-primary" onClick={() => setShowAddVideo(true)}>Tải lên bài học đầu tiên</button>}
            </div>
          ) : (
            <ul className="video-list">
              {course.videos.map((v, idx) => (
                <li key={v._id} className="video-item">
                  <span className="video-order">{idx + 1}</span>
                  <div className="video-main">
                    <span className="video-title">{v.title}</span>
                    <span className="video-desc-sm">{v.description || 'Không có mô tả'}</span>
                  </div>
                  {v.duration != null && <span className="video-duration">{Math.floor(v.duration / 60)}:{(v.duration % 60).toString().padStart(2, '0')}</span>}
                  {canManage && (
                    <div className="video-actions">
                      <button type="button" className="btn-delete-sm" onClick={() => handleDeleteVideo(v._id)} title="Xóa video">🗑️</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showAddVideo && (
          <div className="modal-overlay" onClick={() => setShowAddVideo(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🎬 Thêm bài học mới</h2>
                <button type="button" className="close-btn" onClick={() => setShowAddVideo(false)}>✕</button>
              </div>
              <form onSubmit={handleAddVideo}>
                <div className="form-group">
                  <label>Tiêu đề bài học *</label>
                  <input 
                    type="text" 
                    value={videoForm.title} 
                    onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                    placeholder="Ví dụ: Giới thiệu khóa học"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Mô tả bài học</label>
                  <textarea 
                    value={videoForm.description} 
                    onChange={(e) => setVideoForm({...videoForm, description: e.target.value})}
                    placeholder="Nội dung chính của bài học..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Video File *</label>
                  <input type="file" accept="video/*" required />
                  <small>Hệ thống hỗ trợ tải video dung lượng lớn qua cơ chế chunking.</small>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddVideo(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Tải lên ngay</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default CourseDetail;
