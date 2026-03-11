import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../services/apiService';
import VideoPlayer from './VideoPlayer';
import './CourseLearn.css';

function CourseLearn() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null); // null = show course info page

  useEffect(() => {
    // Chặn các phím tắt save (nhưng cho phép chuột phải)
    const handleKeyDown = (e) => {
      // Chặn Ctrl+S (Save) để tránh download trang
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseService.getOne(courseId);
        const courseData = response.data;
        if (courseData.videos) {
          courseData.videos.sort((a, b) => a.order - b.order);
        }
        setCourse(courseData);
      } catch (error) {
        console.error('Error fetching course:', error);
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, navigate]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!course) return null;

  return (
    <div className="course-learn">
      {/* Header */}
      <header className="learn-header">
        <button onClick={() => navigate('/student/dashboard')} className="back-btn">
          ← Quay lại
        </button>
        <h1 className="learn-title">{course.title}</h1>
      </header>

      <div className="learn-body">
        {/* Sidebar */}
        <aside className="learn-sidebar">
          <button
            className={`sidebar-item info-item ${!selectedVideo ? 'active' : ''}`}
            onClick={() => setSelectedVideo(null)}
          >
            📄 Thông tin khóa học
          </button>

          <div className="sidebar-divider" />
          <p className="sidebar-section-title">🎬 Danh sách bài học</p>

          {course.videos.length === 0 ? (
            <p className="no-videos">Chưa có video nào</p>
          ) : (
            course.videos.map((video, index) => (
              <button
                key={video._id}
                className={`sidebar-item video-item ${selectedVideo?._id === video._id ? 'active' : ''}`}
                onClick={() => setSelectedVideo(video)}
              >
                <span className="video-index">{index + 1}</span>
                <span className="video-info">
                  <span className="video-name">{video.title}</span>
                  {video.duration && (
                    <span className="video-duration">{formatDuration(video.duration)}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </aside>

        {/* Main Content */}
        <main className="learn-main">
          {selectedVideo ? (
            /* Video Page */
            <div className="video-section">
              <VideoPlayer videoId={selectedVideo._id} className="video-player" />
              <div className="video-details">
                <h2>{selectedVideo.title}</h2>
                {selectedVideo.description && <p className="video-desc">{selectedVideo.description}</p>}
              </div>
            </div>
          ) : (
            /* Text / Course Info Page */
            <div className="course-info-section">
              {course.thumbnail && (
                <img src={course.thumbnail} alt={course.title} className="course-thumbnail" />
              )}
              <h2>{course.title}</h2>

              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">👨‍🏫 Giảng viên</span>
                  <span className="meta-value">{course.instructor?.name}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">📊 Cấp độ</span>
                  <span className="meta-value">{course.level}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🎬 Số bài học</span>
                  <span className="meta-value">{course.videos.length} video</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">⭐ Đánh giá</span>
                  <span className="meta-value">{course.rating} / 5</span>
                </div>
              </div>

              <div className="description-box">
                <h3>Mô tả khóa học</h3>
                <p>{course.description}</p>
              </div>

              {course.videos.length > 0 && (
                <button
                  className="btn-start"
                  onClick={() => setSelectedVideo(course.videos[0])}
                >
                  ▶️ Bắt đầu học
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CourseLearn;
