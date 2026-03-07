import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService, userService } from '../services/apiService';
import Layout from '../components/Layout';
import './Courses.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCourses();
  }, [page, searchTerm]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await courseService.getAll({ page, limit: 12, search: searchTerm });
      setCourses(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total ?? 0);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    navigate(`/courses/${course._id}/edit`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('🗑️ Bạn có chắc muốn xóa khóa học này?')) {
      try {
        await courseService.delete(id);
        alert('✅ Xóa khóa học thành công!');
        fetchCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('❌ Không thể xóa khóa học');
      }
    }
  };

  const openCreateModal = () => {
    navigate('/instructor/create-course');
  };

  const thumbSrc = (course) => {
    if (course.thumbnail && course.thumbnail.startsWith('http')) return course.thumbnail;
    if (course.thumbnail && course.thumbnail.startsWith('/')) return `${API_URL}${course.thumbnail}`;
    return null;
  };

  const [thumbErrors, setThumbErrors] = useState({});
  const onThumbError = (courseId) => () => setThumbErrors((prev) => ({ ...prev, [courseId]: true }));
  const showThumb = (course) => thumbSrc(course) && !thumbErrors[course._id];

  const studentCount = (course) => (Array.isArray(course.students) ? course.students.length : 0);
  const videoCount = (course) => (Array.isArray(course.videos) ? course.videos.length : 0);
  const instructorName = (course) => {
    if (!course.instructor) return null;
    return typeof course.instructor === 'object' ? course.instructor.name : course.instructor;
  };

  return (
    <Layout>
      <div className="courses-page">
        <div className="page-header">
          <div className="header-content">
            <h1>📚 Quản lý Khóa học</h1>
            <p className="header-subtitle">Hệ thống quản lý nội dung đào tạo chuyên nghiệp</p>
          </div>
          <button className="btn-primary-large" onClick={openCreateModal}>
            <span className="icon">➕</span> Thêm khóa học mới
          </button>
        </div>

        <div className="courses-controls glass">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên, mô tả, danh mục..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <div className="results-info">
            Đang hiển thị {courses.length} / {total} khóa học
          </div>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card"></div>)}
          </div>
        ) : (
          <>
            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course._id} className="course-card-premium">
                  <div className="course-thumb-container">
                    {showThumb(course) ? (
                      <img
                        src={thumbSrc(course)}
                        alt=""
                        className="course-thumb"
                        onError={onThumbError(course._id)}
                      />
                    ) : (
                      <div className="course-thumb-placeholder">
                        <span>No Image</span>
                      </div>
                    )}
                    <div className="course-badge">{course.level || 'beginner'}</div>
                  </div>
                  
                  <div className="course-card-content">
                    <div className="course-category-tag">{course.category || 'Chưa phân loại'}</div>
                    <h3>{course.title || 'Chưa có tên'}</h3>
                    <p className="course-desc-short">{course.description || '—'}</p>
                    
                    <div className="course-stats">
                      <div className="stat-item">
                        <span className="stat-icon">👥</span>
                        <span>{studentCount(course)} học viên</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">🎬</span>
                        <span>{videoCount(course)} bài học</span>
                      </div>
                    </div>

                    <div className="course-footer">
                      <div className="course-price-premium">
                        {Number(course.price ?? 0).toLocaleString('vi-VN')}đ
                      </div>
                      {isAdmin && instructorName(course) && (
                        <div className="course-instructor-small">
                          Giảng viên: <span>{instructorName(course)}</span>
                        </div>
                      )}
                    </div>

                    <div className="course-actions-premium">
                      <button 
                        type="button" 
                        className="btn-action-view" 
                        onClick={() => navigate(`/courses/${course._id}`)}
                        title="Xem chi tiết"
                      >
                        👁️
                      </button>
                      <button 
                        type="button" 
                        className="btn-action-edit" 
                        onClick={() => handleEdit(course)}
                        title="Chỉnh sửa"
                      >
                        ✏️ Sửa
                      </button>
                      <button 
                        type="button" 
                        className="btn-action-delete" 
                        onClick={() => handleDelete(course._id)}
                        title="Xóa khóa học"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-modern">
                <button 
                  type="button" 
                  className="page-btn"
                  disabled={page <= 1} 
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <div className="page-info">
                  Trang <span>{page}</span> / {totalPages}
                </div>
                <button 
                  type="button" 
                  className="page-btn"
                  disabled={page >= totalPages} 
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            )}

            {courses.length === 0 && (
              <div className="empty-state-premium">
                <div className="empty-icon">📂</div>
                <h3>Chưa có khóa học nào</h3>
                <p>Bắt đầu xây dựng nội dung đào tạo của bạn ngay hôm nay</p>
                <button type="button" className="btn-primary-large" onClick={openCreateModal}>
                   ➕ Tạo khóa học đầu tiên
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default Courses;
