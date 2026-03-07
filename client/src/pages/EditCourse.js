import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, userService } from '../services/apiService';
import Layout from '../components/Layout';
import './EditCourse.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    level: 'beginner',
    instructor: '',
    thumbnail: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCourseData();
    if (isAdmin) {
      fetchInstructors();
    }
  }, [id, isAdmin]);

  const fetchCourseData = async () => {
    try {
      const res = await courseService.getOne(id);
      const course = res.data;
      setFormData({
        title: course.title || '',
        description: course.description || '',
        price: course.price || '',
        category: course.category || '',
        level: course.level || 'beginner',
        instructor: course.instructor?._id || course.instructor || '',
        thumbnail: course.thumbnail || '',
      });
      if (course.thumbnail) {
        setPreviewUrl(course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Không thể tải thông tin khóa học');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const res = await userService.getAll({ limit: 500 });
      const list = res.data || [];
      setInstructors(list.filter((u) => u.role === 'instructor'));
    } catch (error) {
      console.error('Error fetching instructors:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price) || 0,
        category: formData.category,
        level: formData.level,
        thumbnail: formData.thumbnail || undefined,
      };
      
      if (isAdmin && formData.instructor) {
        payload.instructor = formData.instructor;
      }

      await courseService.update(id, payload);

      if (thumbnailFile) {
        const fd = new FormData();
        fd.append('thumbnail', thumbnailFile);
        await courseService.uploadThumbnail(id, fd);
      }

      alert('✅ Cập nhật khóa học thành công!');
      navigate(isAdmin ? '/courses' : '/instructor/courses');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('❌ Có lỗi xảy ra: ' + (error.response?.data?.error || 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải thông tin khóa học...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="edit-course-container">
        <header className="edit-header">
          <button className="back-link" onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          <h1>✏️ Chỉnh sửa khóa học</h1>
          <p className="subtitle">Cập nhật nội dung và thiết lập cho khóa học của bạn</p>
        </header>

        <form onSubmit={handleSubmit} className="edit-form-grid">
          <div className="form-main-card glass">
            <section className="form-section">
              <h3>📝 Thông tin chung</h3>
              <div className="form-group">
                <label>Tiêu đề khóa học *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Nhập tên khóa học..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Mô tả nội dung khóa học..."
                  rows={8}
                  required
                />
              </div>
            </section>

            <section className="form-section">
              <h3>🛠️ Thiết lập & Phân loại</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Danh mục</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Ví dụ: Lập trình Web"
                  />
                </div>
                <div className="form-group">
                  <label>Độ khó</label>
                  <select name="level" value={formData.level} onChange={handleChange}>
                    <option value="beginner">Người mới bắt đầu</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giá bán (VNĐ) *</label>
                  <div className="price-input-wrapper">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="899.000"
                      min="0"
                      required
                    />
                    <span className="currency-label">đ</span>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="form-group">
                    <label>Giảng viên phụ trách</label>
                    <select name="instructor" value={formData.instructor} onChange={handleChange}>
                      <option value="">-- Chọn giảng viên --</option>
                      {instructors.map((inst) => (
                        <option key={inst._id} value={inst._id}>
                          {inst.name} ({inst.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="form-side-panel">
            <div className="thumbnail-card glass">
              <h3>🖼️ Ảnh bìa khóa học</h3>
              <div className="preview-container">
                {previewUrl ? (
                  <img src={previewUrl} alt="Thumbnail preview" />
                ) : (
                  <div className="no-preview">Chưa có ảnh bìa</div>
                )}
              </div>
              
              <div className="upload-section">
                <label className="upload-btn">
                   📁 Chọn ảnh từ máy tính
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                </label>
                <p className="or-text">Hoặc nhập URL</p>
                <input
                  type="text"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="sticky-actions glass">
              <button 
                type="submit" 
                className="btn-submit-large" 
                disabled={saving}
              >
                {saving ? '⏳ Đang lưu...' : '🚀 Lưu thay đổi'}
              </button>
              <button 
                type="button" 
                className="btn-cancel-large" 
                onClick={() => navigate(-1)}
              >
                Hủy bỏ
              </button>
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}

export default EditCourse;
