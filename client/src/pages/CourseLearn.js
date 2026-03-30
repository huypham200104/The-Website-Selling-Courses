import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, quizService } from '../services/apiService';
import VideoPlayer from './VideoPlayer';
import StudentChatBubble from '../components/StudentChatBubble';
import StudentHeader from '../components/StudentHeader';
import './CourseLearn.css';

function CourseLearn() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null); // null = off
  const [selectedQuiz, setSelectedQuiz] = useState(null); // null = off

  // Quiz state
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);

  const handleSelectInfo = () => {
    setSelectedVideo(null);
    setSelectedQuiz(null);
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setSelectedQuiz(null);
  };

  const handleSelectQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setSelectedVideo(null);
    setUserAnswers({});
    setQuizScore(null);
  };

  const handleAnswerChange = (qIndex, optionIndex) => {
    setUserAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });

    const total = selectedQuiz.questions.length;
    const pct = Math.round((correct / total) * 100);

    setQuizScore({
      correct,
      total,
      percentage: pct
    });

    try {
      await quizService.submitResult({
        courseId,
        quizId: selectedQuiz._id || selectedQuiz.title, // fallback to title if _id missing
        quizTitle: selectedQuiz.title,
        score: correct,
        totalQuestions: total,
        percentage: pct,
        answers: userAnswers
      });
      // Give visual feedback that it saved
      alert('✅ Kết quả đã được tự động lưu lại hệ thống!');
    } catch (error) {
      console.error('Error submitting quiz result:', error);
      alert('⚠️ Có lỗi xảy ra khi lưu kết quả. Vui lòng thử lại!');
      // Even if it fails to save, we still show the user their score
    }
  };

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
      <StudentHeader />
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
            className={`sidebar-item info-item ${!selectedVideo && !selectedQuiz ? 'active' : ''}`}
            onClick={handleSelectInfo}
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
                onClick={() => handleSelectVideo(video)}
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

          {course.quizzes && course.quizzes.length > 0 && (
            <>
              <div className="sidebar-divider" />
              <p className="sidebar-section-title">📝 Bài tập trắc nghiệm</p>
              {course.quizzes.map((quiz, index) => (
                <button
                  key={quiz._id || index}
                  className={`sidebar-item quiz-item ${selectedQuiz?._id === quiz._id ? 'active' : ''}`}
                  onClick={() => handleSelectQuiz(quiz)}
                  style={{ display: 'flex', alignItems: 'center', textAlign: 'left', gap: '10px' }}
                >
                  <span className="quiz-icon" style={{ fontSize: '18px' }}>✏️</span>
                  <span className="quiz-info">
                    <span className="quiz-name" style={{ fontWeight: '500' }}>{quiz.title}</span>
                  </span>
                </button>
              ))}
            </>
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
          ) : selectedQuiz ? (
            /* Quiz Page */
            <div className="quiz-section" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '28px', marginBottom: '10px', color: '#1e293b' }}>{selectedQuiz.title}</h2>
              {selectedQuiz.description && <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '16px' }}>{selectedQuiz.description}</p>}
              
              {quizScore ? (
                <div className="quiz-results" style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <h3 style={{ fontSize: '24px', color: '#334155' }}>Kết quả bài làm</h3>
                  <div style={{ fontSize: '64px', fontWeight: '800', color: quizScore.percentage >= 80 ? '#22c55e' : (quizScore.percentage >= 50 ? '#eab308' : '#ef4444'), margin: '20px 0' }}>
                    {quizScore.percentage}%
                  </div>
                  <p style={{ fontSize: '18px', color: '#475569' }}>Bạn trả lời đúng <strong style={{ color: '#0f172a', fontSize: '22px' }}>{quizScore.correct}</strong> trên tổng số {quizScore.total} câu hỏi.</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
                    <button 
                      onClick={() => handleSelectQuiz(selectedQuiz)} // Reset
                      style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'background-color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      🔄 Làm lại bài tập
                    </button>
                    <button 
                      onClick={handleSelectInfo}
                      style={{ padding: '12px 24px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'background-color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#cbd5e1'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    >
                      📄 Về trang tổng quan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="quiz-questions">
                  {selectedQuiz.questions.map((q, qIndex) => (
                    <div key={qIndex} className="question-card" style={{ marginBottom: '30px', padding: '25px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                      <h4 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px', lineHeight: '1.5' }}>
                        <span style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', width: '32px', height: '32px', textAlign: 'center', lineHeight: '32px', borderRadius: '50%', marginRight: '10px' }}>{qIndex + 1}</span>
                        {q.question}
                      </h4>
                      <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {q.options.map((opt, optIndex) => (
                          <label key={optIndex} style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', background: userAnswers[qIndex] === optIndex ? '#eff6ff' : '#f8fafc', border: `2px solid ${userAnswers[qIndex] === optIndex ? '#3b82f6' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', color: '#334155', fontSize: '16px' }}>
                            <input 
                              type="radio" 
                              name={`question_${qIndex}`} 
                              value={optIndex}
                              checked={userAnswers[qIndex] === optIndex}
                              onChange={() => handleAnswerChange(qIndex, optIndex)}
                              style={{ width: '20px', height: '20px', marginRight: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: userAnswers[qIndex] === optIndex ? '600' : '400' }}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #e2e8f0', position: 'sticky', bottom: '0', zIndex: 10, marginTop: '40px', borderRadius: '12px' }}>
                    <button 
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(userAnswers).length < selectedQuiz.questions.length}
                      style={{ width: '100%', padding: '18px', background: Object.keys(userAnswers).length < selectedQuiz.questions.length ? '#cbd5e1' : '#10b981', color: '#fff', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: Object.keys(userAnswers).length < selectedQuiz.questions.length ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: Object.keys(userAnswers).length < selectedQuiz.questions.length ? 'none' : '0 4px 6px -1px rgb(16 185 129 / 0.4)' }}
                    >
                      {Object.keys(userAnswers).length < selectedQuiz.questions.length 
                        ? `Đã trả lời ${Object.keys(userAnswers).length}/${selectedQuiz.questions.length} câu - Vui lòng hoàn thành để nộp bài` 
                        : '✅ Nộp bài kiểm tra'}
                    </button>
                  </div>
                </div>
              )}
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

              {course.videos?.length > 0 ? (
                <button
                  className="btn-start"
                  onClick={() => handleSelectVideo(course.videos[0])}
                >
                  ▶️ Bắt đầu học
                </button>
              ) : (course.quizzes?.length > 0 && (
                <button
                  className="btn-start"
                  onClick={() => handleSelectQuiz(course.quizzes[0])}
                >
                  ▶️ Bắt đầu làm bài tập
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      <StudentChatBubble courseId={courseId} />
    </div>
  );
}

export default CourseLearn;
