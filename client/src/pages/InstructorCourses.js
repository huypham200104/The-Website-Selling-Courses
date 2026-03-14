import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './InstructorCourses.css';

function InstructorCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');

  useEffect(() => {
    fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, searchTerm, filterLevel]);

  const fetchCourses = async () => {
    try {
      const response = await courseService.getAll();
      const myCourses = (response.data || []).filter(
        course => course.instructor._id === user._id
      );
      setCourses(myCourses);
      setFilteredCourses(myCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by level
    if (filterLevel !== 'all') {
      filtered = filtered.filter(course => course.level === filterLevel);
    }

    setFilteredCourses(filtered);
  };

  const handleEdit = (courseId) => {
    navigate(`/instructor/courses/${courseId}/edit`);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Calculate statistics
  const stats = {
    totalCourses: courses.length,
    totalStudents: courses.reduce((sum, course) => sum + (course.students?.length || 0), 0),
    totalVideos: courses.reduce((sum, course) => sum + (course.videos?.length || 0), 0),
    totalRevenue: courses.reduce((sum, course) => sum + (course.price * (course.students?.length || 0)), 0)
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải khóa học...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="instructor-courses-page">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-left">
            <h1>📚 Quản lý khóa học</h1>
            <p>Quản lý và theo dõi các khóa học của bạn</p>
          </div>
          <button 
            className="btn-create"
            onClick={() => navigate('/instructor/create-course')}
          >
            <span className="btn-icon">➕</span>
            <span>Tạo khóa học mới</span>
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>Chưa có khóa học nào</h2>
            <p>Bắt đầu chia sẻ kiến thức của bạn bằng cách tạo khóa học đầu tiên!</p>
            <button 
              className="btn-create-big"
              onClick={() => navigate('/instructor/create-course')}
            >
              <span className="btn-icon">➕</span>
              <span>Tạo khóa học đầu tiên</span>
            </button>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-section">
              <div className="stat-card blue">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <h3>{stats.totalCourses}</h3>
                  <p>Tổng khóa học</p>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-info">
                  <h3>{stats.totalStudents}</h3>
                  <p>Tổng học viên</p>
                </div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">🎬</div>
                <div className="stat-info">
                  <h3>{stats.totalVideos}</h3>
                  <p>Tổng video</p>
                </div>
              </div>
              <div className="stat-card purple">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>{formatCurrency(stats.totalRevenue)}</h3>
                  <p>Doanh thu</p>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <select 
                  value={filterLevel} 
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Tất cả cấp độ</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>

                <div className="view-toggle">
                  <button
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    ▦
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    ☰
                  </button>
                </div>
              </div>
            </div>

            {/* Courses Display */}
            {filteredCourses.length === 0 ? (
              <div className="no-results">
                <p>🔍 Không tìm thấy khóa học phù hợp</p>
              </div>
            ) : (
              <div className={`courses-container ${viewMode}`}>
                {filteredCourses.map(course => (
                  <div key={course._id} className="course-card">
                    <div className="course-image">
                      <img src={course.thumbnail} alt={course.title} />
                      <span className={`level-badge ${course.level}`}>
                        {course.level}
                      </span>
                    </div>

                    <div className="course-content">
                      <h3 className="course-title">{course.title}</h3>
                      <p className="course-description">{course.description}</p>

                      <div className="course-stats">
                        <div className="stat-item">
                          <span className="stat-icon">👨‍🎓</span>
                          <span>{course.students?.length || 0}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">🎬</span>
                          <span>{course.videos?.length || 0}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">⭐</span>
                          <span>{course.rating || 0}</span>
                        </div>
                        <div className="stat-item price">
                          <span className="stat-icon">💰</span>
                          <span>{formatCurrency(course.price)}</span>
                        </div>
                      </div>

                      <div className="course-actions">
                        <button
                          className="btn-action btn-students"
                          onClick={() => handleViewStudents(course)}
                        >
                          👥 Xem học viên
                        </button>
                        <button
                          className="btn-action btn-view"
                          onClick={() => navigate(`/instructor/courses/${course._id}`)}
                        >
                          👁️ Sửa bài học
                        </button>
                        <button
                          className="btn-action btn-edit"
                          onClick={() => handleEdit(course._id)}
                        >
                          ✏️ Sửa khoá học
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
          </>
        )}
      </div>
    </Layout>
  );
}

export default InstructorCourses;
