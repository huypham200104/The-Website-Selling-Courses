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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseService.getAll();
      const myCourses = (response.data || []).filter(
        course => course.instructor._id === user._id
      );
      setCourses(myCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (courseId) => {
    // Navigate to edit page (to be implemented)
    navigate(`/instructor/courses/${courseId}/edit`);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Bạn có chắc muốn xóa khóa học này?')) {
      try {
        await courseService.delete(courseId);
        alert('Xóa khóa học thành công!');
        fetchCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Không thể xóa khóa học');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
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
      <div className="instructor-courses-page">
        <div className="page-header">
          <h1>📚 Khóa học của tôi</h1>
          <button 
            className="btn-create"
            onClick={() => navigate('/instructor/create-course')}
          >
            ➕ Tạo khóa học mới
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>Bạn chưa có khóa học nào</h2>
            <p>Hãy tạo khóa học đầu tiên để bắt đầu chia sẻ kiến thức của bạn!</p>
            <button 
              className="btn-create-big"
              onClick={() => navigate('/instructor/create-course')}
            >
              ➕ Tạo khóa học đầu tiên
            </button>
          </div>
        ) : (
          <div className="courses-list">
            {courses.map(course => (
              <div key={course._id} className="course-item">
                <img src={course.thumbnail} alt={course.title} className="course-thumbnail" />
                <div className="course-details">
                  <div className="course-header-row">
                    <h3>{course.title}</h3>
                    <span className={`level-badge ${course.level}`}>
                      {course.level}
                    </span>
                  </div>
                  <p className="course-description">{course.description}</p>
                  
                  <div className="course-meta-row">
                    <div className="meta-item">
                      <span className="meta-icon">👨‍🎓</span>
                      <span>{course.students?.length || 0} học viên</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">🎬</span>
                      <span>{course.videos?.length || 0} videos</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">⭐</span>
                      <span>{course.rating || 0} rating</span>
                    </div>
                    <div className="meta-item price">
                      <span className="meta-icon">💰</span>
                      <span>{formatCurrency(course.price)}</span>
                    </div>
                  </div>
                </div>

                <div className="course-actions">
                  <button 
                    className="btn-view"
                    onClick={() => navigate(`/instructor/courses/${course._id}`)}
                  >
                    👁️ Xem
                  </button>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(course._id)}
                  >
                    ✏️ Sửa
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(course._id)}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default InstructorCourses;
