import React, { useState, useEffect } from 'react';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
 level: 'beginner',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await courseService.update(editingCourse._id, formData);
        alert('Cập nhật khóa học thành công!');
      } else {
        await courseService.create(formData);
        alert('Tạo khóa học thành công!');
      }
      setShowModal(false);
      setEditingCourse(null);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      price: course.price,
      category: course.category || '',
      level: course.level || 'beginner',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa khóa học này?')) {
      try {
        await courseService.delete(id);
        alert('Xóa khóa học thành công!');
        fetchCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Không thể xóa khóa học');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      level: 'beginner',
    });
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Đang tải...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="courses-page">
        <div className="page-header">
          <h1>📚 Quản lý Khóa học</h1>
          <button className="btn-primary" onClick={openCreateModal}>
            + Thêm khóa học mới
          </button>
        </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div key={course._id} className="course-card">
            <div className="course-header">
              <h3>{course.title}</h3>
              <span className="course-level">{course.level}</span>
            </div>
            <p className="course-description">{course.description}</p>
            <div className="course-meta">
              <span className="course-price">
                💰 {course.price.toLocaleString('vi-VN')}đ
              </span>
              <span className="course-students">
                👥 {course.students?.length || 0} học viên
              </span>
            </div>
            <div className="course-category">
              📂 {course.category || 'Chưa phân loại'}
            </div>
            <div className="course-videos">
              🎬 {course.videos?.length || 0} videos
            </div>
            <div className="course-actions">
              <button className="btn-edit" onClick={() => handleEdit(course)}>
                ✏️ Sửa
              </button>
              <button className="btn-delete" onClick={() => handleDelete(course._id)}>
                🗑️ Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="empty-state">
          <p>Chưa có khóa học nào</p>
          <button className="btn-primary" onClick={openCreateModal}>
            Tạo khóa học đầu tiên
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? 'Sửa khóa học' : 'Thêm khóa học mới'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên khóa học *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giá (VNĐ) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Danh mục</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Web Development"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Độ khó *</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingCourse ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

export default Courses;
