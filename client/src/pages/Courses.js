import React, { useState, useEffect } from 'react';
import { courseService, userService } from '../services/apiService';
import Layout from '../components/Layout';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'published', 'rejected'
  const [instructorFilter, setInstructorFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    level: 'beginner',
    thumbnail: '',
    instructorId: ''
  });
  const [instructors, setInstructors] = useState([]);

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCourse, setDetailCourse] = useState(null);
  const [detailReviews, setDetailReviews] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async (name = instructorFilter) => {
    try {
      setLoading(true);
      const term = (name || '').trim();
      const [courseRes, userRes] = await Promise.all([
        courseService.getAdminAll({ instructorName: term || undefined }),
        userService.getAll()
      ]);
      const instructorList = (userRes.data || []).filter(u => u.role === 'instructor');
      setInstructors(instructorList);
      setCourses(courseRes.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInstructor = () => {
    fetchCourses(instructorFilter.trim());
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
      thumbnail: course.thumbnail || '',
      instructorId: course.instructor?._id || ''
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

  const handleViewDetails = async (course) => {
    setDetailCourse(course);
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await courseService.getReviews(course._id);
      const reviewsData = res?.data || [];
      setDetailReviews(Array.isArray(reviewsData) ? reviewsData : reviewsData.data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      alert('Không thể tải bình luận');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteReview = async (courseId, reviewId) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    try {
      await courseService.deleteReview(courseId, reviewId);
      setDetailReviews((prev) => prev.filter((r) => r._id !== reviewId));
      alert('Đã xóa bình luận');
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Không thể xóa bình luận');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      level: 'beginner',
      thumbnail: '',
      instructorId: instructors[0]?._id || ''
    });
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    resetForm();
    setShowModal(true);
  };

  const filteredCourses = courses.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    const term = instructorFilter.trim();
    if (!term) return true;
    const name = c.instructor?.name || '';
    return name.toLowerCase().includes(term.toLowerCase());
  });

  const getStatusBadge = (status) => {
    const badges = {
      published: { icon: '✅', text: 'Đã xuất bản', class: 'published' },
      pending: { icon: '⏳', text: 'Chờ duyệt', class: 'pending' },
      rejected: { icon: '❌', text: 'Từ chối', class: 'rejected' },
      disabled: { icon: '🚫', text: 'Đã vô hiệu', class: 'rejected' },
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
          <button className="btn-create" onClick={openCreateModal}>
            ➕ Tạo khóa học
          </button>
        </div>

        <div className="filters-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <label className="filter-label">Lọc theo giảng viên</label>
            <input
              type="text"
              placeholder="Nhập tên giảng viên..."
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchInstructor();
              }}
              style={{ minWidth: '240px' }}
            />
          </div>
          <button className="btn-search" onClick={handleSearchInstructor}>
            🔍 Tìm kiếm
          </button>
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
        <button
          className={filter === 'disabled' ? 'active' : ''}
          onClick={() => setFilter('disabled')}
        >
          Vô hiệu ({courses.filter(c => c.status === 'disabled').length})
        </button>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => {
          const badge = getStatusBadge(course.status || 'published');
          
          return (
            <div key={course._id} className="course-card">
              <div className="course-thumb" style={{ width: '100%', marginBottom: '12px' }}>
                <img
                  src={course.thumbnail || 'https://via.placeholder.com/600x300?text=No+image'}
                  alt={course.title}
                  style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', background: '#f3f4f6' }}
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/600x300?text=No+image'; }}
                />
              </div>
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

              <div className="card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button className="btn-secondary" onClick={() => handleViewDetails(course)}>
                  👁️ Xem chi tiết
                </button>
                <button className="btn-secondary" onClick={() => handleViewStudents(course)}>
                  👥 Học viên
                </button>
                <button className="btn-edit" onClick={() => handleEdit(course)}>✏️ Sửa</button>
                <button className="btn-delete" onClick={() => handleDelete(course._id)}>🗑️ Xóa</button>
                <select
                  value={course.status || 'pending'}
                  onChange={(e) => handleUpdateStatus(course._id, e.target.value)}
                >
                  <option value="pending">Chờ duyệt</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="rejected">Từ chối</option>
                  <option value="disabled">Vô hiệu</option>
                </select>
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

      {showDetailModal && detailCourse && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#fff',
              borderRadius: '10px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0 }}>Chi tiết khóa học</h2>
                <button className="modal-close" onClick={() => setShowDetailModal(false)} style={{ fontSize: '18px' }}>×</button>
              </div>
            <div className="modal-body" style={{ display: 'grid', gap: '8px' }}>
              <h3>{detailCourse.title}</h3>
              <p><strong>Giảng viên:</strong> {detailCourse.instructor?.name}</p>
              <p><strong>Giá:</strong> {detailCourse.price?.toLocaleString?.('vi-VN')}đ</p>
              <p><strong>Trạng thái:</strong> {detailCourse.status || 'pending'}</p>
              <p><strong>Mô tả:</strong> {detailCourse.description}</p>
              <p><strong>Số video:</strong> {detailCourse.videos?.length || 0}</p>
              <p><strong>Số bài tập:</strong> {detailCourse.quizzes?.length || 0}</p>

              <h4 style={{ marginTop: '12px' }}>Bình luận / đánh giá</h4>
              {detailLoading ? (
                <p>Đang tải...</p>
              ) : detailReviews.length === 0 ? (
                <p>Chưa có bình luận.</p>
              ) : (
                <div className="reviews-list">
                  {detailReviews.map((rev) => (
                    <div key={rev._id} className="review-item">
                      <div className="review-header-row">
                        <div>
                          <strong>{rev.student?.name || 'Học viên'}</strong>
                          <span style={{ marginLeft: '8px' }}>⭐ {rev.rating}</span>
                        </div>
                        <button className="btn-delete" onClick={() => handleDeleteReview(detailCourse._id, rev._id)}>🗑️ Xóa</button>
                      </div>
                      {rev.comment && <p>{rev.comment}</p>}
                      {rev.reply?.text && (
                        <div className="review-reply">
                          <strong>Phản hồi:</strong> {rev.reply.text}
                        </div>
                      )}
                      <div className="review-meta">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleString('vi-VN') : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
            </div>
          </div>
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

              <div className="form-group">
                <label>Ảnh minh họa (URL)</label>
                <input
                  type="url"
                  name="thumbnail"
                  placeholder="https://..."
                  value={formData.thumbnail}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Giảng viên</label>
                <select name="instructorId" value={formData.instructorId} onChange={handleInputChange} required>
                  <option value="" disabled>-- Chọn giảng viên --</option>
                  {instructors.map(inst => (
                    <option key={inst._id} value={inst._id}>{inst.name} ({inst.email})</option>
                  ))}
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
