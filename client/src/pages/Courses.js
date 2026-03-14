import React, { useState, useEffect } from 'react';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'published', 'rejected'
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
 level: 'beginner',
  });

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAdminAll();
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

  const handleUpdateStatus = async (id, status) => {
    try {
      await courseService.updateStatus(id, status);
      alert('Cập nhật trạng thái thành công!');
      fetchCourses();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Không thể cập nhật trạng thái');
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

  const handleViewStudents = async (course) => {
    try {
      const response = await courseService.getStudents(course._id);
      setCourseStudents(response.data || []);
      setSelectedCourseTitle(course.title);
      setShowStudentsModal(true);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Không thể tải danh sách học viên');
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

  const filteredCourses = courses.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      published: { icon: '✅', text: 'Đã xuất bản', class: 'published' },
      pending: { icon: '⏳', text: 'Chờ duyệt', class: 'pending' },
      rejected: { icon: '❌', text: 'Từ chối', class: 'rejected' },
    };
    return badges[status] || badges.pending; // Default if old DB
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
        </div>

      <div className="filter-tabs" style={{ marginBottom: '20px' }}>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Tất cả ({courses.length})
        </button>
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Chờ duyệt ({courses.filter(c => c.status === 'pending').length})
        </button>
        <button
          className={filter === 'published' ? 'active' : ''}
          onClick={() => setFilter('published')}
        >
          Đã xuất bản ({courses.filter(c => c.status === 'published' || !c.status).length})
        </button>
        <button
          className={filter === 'rejected' ? 'active' : ''}
          onClick={() => setFilter('rejected')}
        >
          Từ chối ({courses.filter(c => c.status === 'rejected').length})
        </button>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => {
          const badge = getStatusBadge(course.status || 'published');
          
          return (
            <div key={course._id} className="course-card">
              <div className="course-header">
                <h3>{course.title}</h3>
                <span className="course-level">{course.level}</span>
              </div>
              <p className="course-description">{course.description}</p>
              
              <div className="course-status-banner" style={{ margin: '10px 0', padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary-color)' }}>
                <strong>Trạng thái: </strong>
                <span className={`status-badge ${badge.class}`}>
                  {badge.icon} {badge.text}
                </span>
                <p style={{fontSize: '0.85rem', marginTop: '5px', color: '#666'}}>
                  👨‍🏫 Instructor: {course.instructor?.name || course.instructor?.email || 'N/A'}
                </p>
              </div>

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

              <div className="course-approval-actions" style={{display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '10px'}}>
                {(course.status === 'pending' || course.status === 'rejected') && (
                  <button className="btn-approve" style={{flex: 1, padding: '8px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px'}} onClick={() => handleUpdateStatus(course._id, 'published')}>
                    ✅ Duyệt
                  </button>
                )}
                {course.status === 'pending' && (
                  <button className="btn-reject" style={{flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px'}} onClick={() => handleUpdateStatus(course._id, 'rejected')}>
                    ❌ Từ chối
                  </button>
                )}
              </div>

              <div className="course-actions">
                <button className="btn-view" onClick={() => handleViewStudents(course)}>
                  👥 Học viên
                </button>
                <button className="btn-edit" onClick={() => handleEdit(course)}>
                  ✏️ Sửa
                </button>
                <button className="btn-delete" onClick={() => handleDelete(course._id)}>
                  🗑️ Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="empty-state">
          <p>Chưa có khóa học nào</p>
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

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="modal-overlay" onClick={() => setShowStudentsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Học viên - {selectedCourseTitle}</h2>
              <button className="close-btn" onClick={() => setShowStudentsModal(false)}>
                ✕
              </button>
            </div>
            <div className="students-list" style={{ padding: '20px 0' }}>
              {courseStudents.length === 0 ? (
                <p>Khóa học này chưa có học viên nào.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '15px' }}>
                  {courseStudents.map(student => (
                    <div key={student._id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <img 
                        src={student.avatar || 'https://via.placeholder.com/50'} 
                        alt={student.name} 
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <h4 style={{ margin: '0 0 5px 0' }}>{student.name}</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

export default Courses;
