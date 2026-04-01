import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, quizService, certificateService } from '../services/apiService';
import VideoPlayer from './VideoPlayer';
import StudentChatBubble from '../components/StudentChatBubble';
import StudentHeader from '../components/StudentHeader';
import { useAuth } from '../context/AuthContext';
import './CourseLearn.css';

function CourseLearn() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null); // null = off
  const [selectedQuiz, setSelectedQuiz] = useState(null); // null = off

  // Quiz state
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const [myResults, setMyResults] = useState([]);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Review state
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ averageRating: 0, reviewCount: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: 'Nội dung gian lận', message: '', contactPhone: '' });
  const [reportStatus, setReportStatus] = useState({ type: '', text: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const response = await courseService.getReviews(courseId);
      setReviews(response.data || []);
      setReviewMeta(response.meta || { averageRating: 0, reviewCount: 0 });
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }, [courseId]);

  const fetchMyResults = useCallback(async () => {
    if (!user) return;
    try {
      const response = await quizService.getMyResults();
      if (response?.success) {
        const filtered = (response.data || []).filter((r) => {
          const courseRef = r.course?._id || r.course?.toString?.() || r.course;
          return courseRef && courseRef.toString() === courseId;
        });
        setMyResults(filtered);
      }
    } catch (error) {
      console.error('Error loading quiz results:', error);
    }
  }, [courseId, user]);

  const handleSelectInfo = () => {
    setSelectedVideo(null);
    setSelectedQuiz(null);
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setSelectedQuiz(null);
  };

  const handleSelectQuiz = (quiz) => {
    const key = getQuizKey(quiz);
    const idx = (course?.quizzes || []).findIndex((q) => getQuizKey(q) === key);
    if (idx > 0) {
      const prevQuiz = course.quizzes[idx - 1];
      const prevKey = getQuizKey(prevQuiz);
      const prevResult = myResults.find((r) => r.quizId === prevKey);
      const unlocked = prevResult && prevResult.status === 'graded' && prevResult.score > 5;
      if (!unlocked) {
        alert('Cần đạt trên 5 điểm ở bài trước để mở bài này.');
        return;
      }
    }
    setSelectedQuiz(quiz);
    setSelectedVideo(null);
    setUserAnswers({});
    setQuizScore(null);
  };

  const isEssayQuestion = (q) => !q.options || q.options.length === 0;

  const getQuizKey = useCallback((quiz) => {
    if (!quiz) return '';
    return quiz._id || quiz.id || quiz.quizId || quiz.title || '';
  }, []);

  const getResultForQuiz = useCallback((quiz) => {
    const key = getQuizKey(quiz);
    return key ? myResults.find((r) => r.quizId === key) : null;
  }, [myResults, getQuizKey]);

  const isSelectedEssayQuiz = useMemo(() => (
    selectedQuiz ? selectedQuiz.questions?.some(isEssayQuestion) : false
  ), [selectedQuiz]);

  const existingResult = useMemo(() => getResultForQuiz(selectedQuiz), [selectedQuiz, getResultForQuiz]);
  const canRetry = useMemo(() => {
    if (!existingResult) return false;
    // Essay: only retry if graded and <=5. MCQ: always allow retry.
    if (isSelectedEssayQuiz) {
      return existingResult.status === 'graded' && Number(existingResult.score) <= 5;
    }
    return true;
  }, [existingResult, isSelectedEssayQuiz]);

  // If đã chấm, hiển thị điểm lưu trên server
  useEffect(() => {
    if (existingResult && existingResult.status === 'graded') {
      setQuizScore({
        correct: existingResult.score,
        total: 10,
        percentage: existingResult.percentage
      });
    }
  }, [existingResult]);

  const allQuestionsAnswered = () => (
    selectedQuiz ? selectedQuiz.questions.every((q, idx) => isEssayQuestion(q) ? !!userAnswers[idx] : userAnswers[idx] !== undefined) : false
  );

  const answeredCount = () => (
    selectedQuiz ? selectedQuiz.questions.reduce((count, q, idx) => count + (isEssayQuestion(q) ? (userAnswers[idx] ? 1 : 0) : (userAnswers[idx] !== undefined ? 1 : 0)), 0) : 0
  );

  const handleAnswerChange = (qIndex, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [qIndex]: value
    }));
  };

  const handleDownloadCertificate = async () => {
    if (!isCertificateReady) {
      alert('Bạn cần hoàn thành đủ 1 video và tất cả bài tập (>=5/10) để tải chứng chỉ.');
      return;
    }
    try {
      setDownloadingCert(true);
      const response = await certificateService.download(courseId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${course?.title || 'course'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      const msg = error?.response?.data?.message || 'Không thể tải chứng chỉ. Vui lòng thử lại.';
      alert(msg);
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    if (existingResult && !canRetry) {
      alert('Bạn đã nộp bài này, vui lòng chờ giảng viên chấm.');
      return;
    }
    if (!selectedQuiz.questions || selectedQuiz.questions.length === 0) {
      alert('Bài tập chưa có câu hỏi.');
      return;
    }
    const hasEssay = selectedQuiz.questions.some(isEssayQuestion);
    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (isEssayQuestion(q)) {
        if (userAnswers[idx]) {
          correct += 1; // coi như hoàn thành khi đã điền link
        }
      } else if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });

    const total = selectedQuiz.questions.length;
    const pct = hasEssay ? 0 : (total > 0 ? Math.round((correct / total) * 100) : 0);

    setQuizScore({
      correct,
      total: hasEssay ? 10 : total,
      percentage: pct
    });

    try {
      const response = await quizService.submitResult({
        courseId,
        quizId: selectedQuiz._id || selectedQuiz.title, // fallback to title if _id missing
        quizTitle: selectedQuiz.title,
        score: correct,
        totalQuestions: total,
        percentage: pct,
        answers: userAnswers
      });
      if (response?.success && response.data) {
        setMyResults((prev) => {
          const key = getQuizKey(selectedQuiz);
          const idx = prev.findIndex((r) => r.quizId === key);
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = response.data;
            return clone;
          }
          return [...prev, response.data];
        });
      }
      // Give visual feedback that it saved
      alert('✅ Kết quả đã được tự động lưu lại hệ thống!');
    } catch (error) {
      if (error?.response?.status === 409) {
        alert(error?.response?.data?.message || 'Bạn đã nộp bài này, vui lòng chờ giảng viên chấm.');
        await fetchMyResults();
        return;
      }
      const apiMsg = error?.response?.data?.message;
      console.error('Error submitting quiz result:', error);
      alert(apiMsg || '⚠️ Có lỗi xảy ra khi lưu kết quả. Vui lòng thử lại!');
      // Even if it fails to save, we still show the user their score
    }
  };

  const handleSelectRating = (value) => {
    setReviewForm((prev) => ({ ...prev, rating: value }));
    setReviewError('');
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportStatus({ type: '', text: '' });

    if (!user) {
      setReportStatus({ type: 'error', text: 'Bạn cần đăng nhập để báo cáo.' });
      return;
    }

    const trimmedMessage = (reportForm.message || '').trim();
    const trimmedReason = (reportForm.reason || '').trim();
    if (!trimmedReason && !trimmedMessage) {
      setReportStatus({ type: 'error', text: 'Vui lòng nhập nội dung báo cáo.' });
      return;
    }

    try {
      setReportSubmitting(true);
      await courseService.reportCourse(courseId, {
        reason: trimmedReason,
        message: trimmedMessage,
        contactPhone: reportForm.contactPhone?.trim() || '',
      });
      setReportStatus({ type: 'success', text: 'Đã gửi báo cáo cho giảng viên/admin.' });
      setReportForm({ reason: 'Nội dung gian lận', message: '', contactPhone: '' });
      setReportOpen(false);
    } catch (error) {
      console.error('Report course error:', error);
      const apiMsg = error?.response?.data?.error || error?.response?.data?.message;
      setReportStatus({ type: 'error', text: apiMsg || 'Gửi báo cáo thất bại.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReviewCommentChange = (e) => {
    setReviewForm((prev) => ({ ...prev, comment: e.target.value }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!canSubmitReview) return;
    if (!reviewForm.rating) {
      setReviewError('Vui lòng chọn số sao trước khi gửi đánh giá.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    try {
      await courseService.addReview(courseId, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setReviewForm({ rating: 0, comment: '' });
      await loadReviews();
    } catch (error) {
      const errMsg = error?.response?.data?.error || 'Không thể gửi đánh giá. Vui lòng thử lại sau.';
      setReviewError(errMsg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (value = 0) => (
    <div className="reviews-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={value >= star ? 'filled' : 'empty'}>
          ★
        </span>
      ))}
    </div>
  );

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
        setLoadError('');
        const response = await courseService.getOne(courseId);
        const courseData = response.data;
        if (courseData.videos) {
          courseData.videos.sort((a, b) => a.order - b.order);
        }
        setCourse(courseData);
      } catch (error) {
        console.error('Error fetching course:', error);
        setLoadError('Không tải được khóa học này.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, navigate]);

  useEffect(() => {
    const fetchMyCoursesList = async () => {
      if (!user) return;
      try {
        const all = await courseService.getAll();
        const items = Array.isArray(all?.data) ? all.data : Array.isArray(all) ? all : [];
        const enrolled = items.filter((c) => (c.students || []).some((s) => {
          if (!s) return false;
          if (typeof s === 'string') return s === user._id;
          if (typeof s === 'object' && s._id) return s._id === user._id;
          return s.toString() === user._id;
        }));
        setMyCourses(enrolled);
      } catch (err) {
        console.error('Error loading my courses list:', err);
      }
    };
    fetchMyCoursesList();
  }, [user]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    fetchMyResults();
  }, [fetchMyResults]);

  const isEnrolled = useMemo(() => {
    if (!course || !user) return false;
    return (course.students || []).some((student) => {
      if (!student) return false;
      if (typeof student === 'string') return student === user._id;
      if (typeof student === 'object' && student._id) return student._id === user._id;
      return student.toString() === user._id;
    });
  }, [course, user]);

  const userHasReview = useMemo(() => {
    if (!user) return false;
    return reviews.some((review) => {
      const reviewerId = review.student?._id || review.student;
      return reviewerId && reviewerId.toString() === user._id;
    });
  }, [reviews, user]);

  const canSubmitReview = isEnrolled && !userHasReview;

  const isCertificateReady = useMemo(() => {
    if (!course || !isEnrolled) return false;
    const hasStructure = (course.videos?.length || 0) >= 1 && (course.quizzes?.length || 0) >= 2;
    if (!hasStructure) return false;
    return (course.quizzes || []).every((quiz) => {
      const key = getQuizKey(quiz);
      if (!key) return false;
      const res = myResults.find((r) => r.quizId === key && r.status === 'graded');
      return res && Number(res.score) >= 5;
    });
  }, [course, isEnrolled, myResults, getQuizKey]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!course) return <div className="error-message">{loadError || 'Không tìm thấy khóa học'}</div>;

  return (
    <div className="course-learn">
      <StudentHeader />
      {/* Header */}
      <header className="learn-header">
        <button onClick={() => navigate('/student/dashboard')} className="back-btn">
          ← Quay lại
        </button>
        <h1 className="learn-title">{course.title}</h1>
        {myCourses.length > 1 && (
          <div className="course-switcher">
            <label htmlFor="course-switch" className="switch-label">Chuyển khóa:</label>
            <select
              id="course-switch"
              value={courseId}
              onChange={(e) => {
                const targetId = e.target.value;
                if (targetId && targetId !== courseId) {
                  navigate(`/student/course/${targetId}`);
                }
              }}
            >
              {myCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
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
                (() => {
                  const submitted = myResults.some((r) => r.quizId === getQuizKey(quiz));
                  const locked = index > 0 ? !(() => {
                    const prev = course.quizzes[index - 1];
                    const prevResult = getResultForQuiz(prev);
                    return prevResult && prevResult.status === 'graded' && prevResult.score > 5;
                  })() : false;
                  return (
                <button
                  key={quiz._id || index}
                  className={`sidebar-item quiz-item ${selectedQuiz?._id === quiz._id ? 'active' : ''}`}
                  onClick={() => handleSelectQuiz(quiz)}
                  disabled={locked}
                  style={{ display: 'flex', alignItems: 'center', textAlign: 'left', gap: '10px', opacity: locked ? 0.6 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                >
                  <span className="quiz-icon" style={{ fontSize: '18px' }}>✏️</span>
                  <span className="quiz-info">
                    <span className="quiz-name" style={{ fontWeight: '500' }}>{quiz.title}</span>
                    {locked && <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>Khoá - cần &gt;5 điểm bài trước</span>}
                    {submitted && !locked && <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>Đã nộp</span>}
                  </span>
                </button>
                  );
                })()
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
                {existingResult && (
                  <div style={{ padding: '14px 16px', background: existingResult.status === 'graded' ? '#ecfdf3' : '#fff7ed', border: '1px solid', borderColor: existingResult.status === 'graded' ? '#86efac' : '#fdba74', borderRadius: '10px', color: existingResult.status === 'graded' ? '#166534' : '#b45309', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span role="img" aria-label="status">{existingResult.status === 'graded' ? (canRetry ? '❌' : '✅') : '⏳'}</span>
                      <span>
                        {existingResult.status === 'graded'
                            ? (canRetry
                              ? `Chưa đạt (${existingResult.score}/10). Bạn có thể nộp lại.`
                              : `Đã chấm: ${existingResult.score}/10 (${existingResult.percentage}%)`)
                          : 'Đã nộp bài. Đang chờ giảng viên chấm.'}
                      </span>
                    </div>
                    {existingResult.gradedAt && (
                      <span style={{ fontSize: '12px', color: existingResult.status === 'graded' ? '#15803d' : '#92400e' }}>
                        {`Cập nhật: ${new Date(existingResult.gradedAt).toLocaleString('vi-VN')}`}
                      </span>
                    )}
                  </div>
                )}
              
              {quizScore ? (
                <div className="quiz-results" style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <h3 style={{ fontSize: '24px', color: '#334155' }}>Kết quả bài làm</h3>
                  <div style={{ fontSize: '64px', fontWeight: '800', color: quizScore.percentage >= 80 ? '#22c55e' : (quizScore.percentage >= 50 ? '#eab308' : '#ef4444'), margin: '20px 0' }}>
                    {quizScore.percentage}%
                  </div>
                  <p style={{ fontSize: '18px', color: '#475569' }}>Bạn trả lời đúng <strong style={{ color: '#0f172a', fontSize: '22px' }}>{quizScore.correct}</strong> trên tổng số {quizScore.total} câu hỏi.</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' }}>
                    {!existingResult && (
                      <button 
                        onClick={() => handleSelectQuiz(selectedQuiz)} // Reset
                        style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'background-color 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        🔄 Làm lại bài tập
                      </button>
                    )}
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
                      {isEssayQuestion(q) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="url"
                            placeholder="Dán link bài làm của bạn"
                            value={userAnswers[qIndex] || ''}
                            onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                            disabled={!!existingResult && !canRetry}
                            style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', background: (!!existingResult && !canRetry) ? '#f8fafc' : '#fff' }}
                          />
                          <span style={{ color: '#64748b', fontSize: '14px' }}>Chấp nhận link Google Docs, Drive, hoặc bất kỳ URL hợp lệ.</span>
                        </div>
                      ) : (
                        <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {q.options.map((opt, optIndex) => (
                            <label key={optIndex} style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', background: userAnswers[qIndex] === optIndex ? '#eff6ff' : '#f8fafc', border: `2px solid ${userAnswers[qIndex] === optIndex ? '#3b82f6' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', color: '#334155', fontSize: '16px' }}>
                              <input 
                                type="radio" 
                                name={`question_${qIndex}`} 
                                value={optIndex}
                                checked={userAnswers[qIndex] === optIndex}
                                onChange={() => handleAnswerChange(qIndex, optIndex)}
                                disabled={!!existingResult && !canRetry}
                                style={{ width: '20px', height: '20px', marginRight: '15px', accentColor: '#3b82f6', cursor: (!!existingResult && !canRetry) ? 'not-allowed' : 'pointer' }}
                              />
                              <span style={{ fontWeight: userAnswers[qIndex] === optIndex ? '600' : '400' }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #e2e8f0', position: 'sticky', bottom: '0', zIndex: 10, marginTop: '40px', borderRadius: '12px' }}>
                    <button 
                      onClick={handleSubmitQuiz}
                      disabled={!!existingResult || !allQuestionsAnswered()}
                      style={{ width: '100%', padding: '18px', background: (!!existingResult || !allQuestionsAnswered()) ? '#cbd5e1' : '#10b981', color: '#fff', fontSize: '18px', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: (!!existingResult || !allQuestionsAnswered()) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (!!existingResult || !allQuestionsAnswered()) ? 'none' : '0 4px 6px -1px rgb(16 185 129 / 0.4)' }}
                    >
                      {existingResult && !canRetry
                        ? 'Đã nộp - chờ giảng viên chấm'
                        : (!allQuestionsAnswered()
                          ? `Đã trả lời ${answeredCount()}/${selectedQuiz.questions.length} câu - Vui lòng hoàn thành để nộp bài`
                          : '✅ Nộp bài kiểm tra')}
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

              {isEnrolled && (
                <div className="report-card">
                  <div className="report-header">
                    <div>
                      <h3>🚩 Báo cáo khóa học</h3>
                      <p className="report-subtext">Gửi báo cáo nếu phát hiện gian lận, nội dung sai lệch.</p>
                    </div>
                    {reportStatus.text && (
                      <span className={reportStatus.type === 'success' ? 'report-status success' : 'report-status error'}>
                        {reportStatus.text}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-report"
                    onClick={() => setReportOpen((v) => !v)}
                  >
                    {reportOpen ? 'Đóng' : 'Báo cáo gian lận'}
                  </button>

                  {reportOpen && (
                    <form className="report-box" onSubmit={handleReportSubmit}>
                      <div className="report-row">
                        <label>Lý do</label>
                        <select
                          value={reportForm.reason}
                          onChange={(e) => setReportForm((p) => ({ ...p, reason: e.target.value }))}
                        >
                          <option value="Nội dung gian lận">Nội dung gian lận</option>
                          <option value="Bản quyền / đạo văn">Bản quyền / đạo văn</option>
                          <option value="Spam hoặc nội dung sai">Spam hoặc nội dung sai</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                      <div className="report-row">
                        <label>Chi tiết</label>
                        <textarea
                          value={reportForm.message}
                          onChange={(e) => setReportForm((p) => ({ ...p, message: e.target.value }))}
                          placeholder="Mô tả hành vi gian lận hoặc bằng chứng (link, timestamp, ... )"
                          rows={3}
                        />
                      </div>
                      <div className="report-row">
                        <label>Số điện thoại liên hệ (tùy chọn)</label>
                        <input
                          type="tel"
                          value={reportForm.contactPhone}
                          onChange={(e) => setReportForm((p) => ({ ...p, contactPhone: e.target.value }))}
                          placeholder="VD: 0901234567"
                        />
                      </div>
                      <div className="report-actions">
                        <button type="button" onClick={() => setReportOpen(false)} className="btn-secondary">Đóng</button>
                        <button type="submit" className="btn-primary" disabled={reportSubmitting}>
                          {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {isEnrolled && (
                <div className="certificate-panel">
                  <div>
                    <h3>🎖️ Chứng chỉ hoàn thành</h3>
                    {!isCertificateReady && (
                      <p className="cert-status">Chưa đủ điều kiện tải chứng chỉ.</p>
                    )}
                  </div>
                  <button
                    className="btn-download-cert"
                    onClick={handleDownloadCertificate}
                    disabled={!isCertificateReady || downloadingCert}
                  >
                    {downloadingCert ? 'Đang tải...' : 'Tải chứng chỉ (PDF)'}
                  </button>
                </div>
              )}

              <div className="description-box">
                <h3>Mô tả khóa học</h3>
                <p>{course.description}</p>
              </div>

              <div className="reviews-section">
                <div className="reviews-heading">
                  <div>
                    <h3>⭐ Đánh giá &amp; nhận xét</h3>
                    <p className="reviews-subtitle">Lắng nghe cảm nhận từ cộng đồng học viên</p>
                  </div>
                  <div className="rating-summary">
                    <span className="rating-score">{(reviewMeta.averageRating || 0).toFixed(1)}</span>
                    <div className="rating-details">
                      {renderStars(reviewMeta.averageRating || 0)}
                      <span className="rating-count">{reviewMeta.reviewCount || 0} đánh giá</span>
                    </div>
                  </div>
                </div>

                {isEnrolled && (
                  <div className="review-form-card">
                    {userHasReview ? (
                      <div className="review-success">✅ Bạn đã gửi đánh giá cho khóa học này. Cảm ơn bạn!</div>
                    ) : (
                      <form onSubmit={handleSubmitReview}>
                        <label className="form-label">Chọn số sao</label>
                        <div className="star-input" role="radiogroup" aria-label="Chọn số sao đánh giá">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              className={reviewForm.rating >= star ? 'filled' : ''}
                              onClick={() => handleSelectRating(star)}
                              aria-pressed={reviewForm.rating >= star}
                              aria-label={`Đánh giá ${star} sao`}
                            >
                              ★
                            </button>
                          ))}
                        </div>

                        <label className="form-label" htmlFor="review-comment">Nhận xét (tùy chọn)</label>
                        <textarea
                          id="review-comment"
                          rows={3}
                          maxLength={1000}
                          placeholder="Chia sẻ cảm nhận của bạn về khóa học này..."
                          value={reviewForm.comment}
                          onChange={handleReviewCommentChange}
                        />
                        {reviewError && <p className="review-error">{reviewError}</p>}
                        <button type="submit" className="btn-submit-review" disabled={submittingReview}>
                          {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {!isEnrolled && (
                  <div className="review-info-box">
                    🔒 Bạn cần tham gia khóa học để có thể gửi đánh giá.
                  </div>
                )}

                <div className="review-list">
                  {reviewsLoading ? (
                    <div className="reviews-placeholder">Đang tải đánh giá...</div>
                  ) : reviews.length === 0 ? (
                    <div className="reviews-placeholder">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!</div>
                  ) : (
                    reviews.map((review) => (
                      <div className="review-card" key={review._id}>
                        <img
                          src={
                            review.student?.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(review.student?.name || 'User')}&background=random&color=fff`
                          }
                          alt={review.student?.name}
                          className="review-avatar"
                        />
                        <div className="review-content">
                          <div className="review-header-row">
                            <div>
                              <strong>{review.student?.name || 'Học viên'}</strong>
                              <div className="review-date">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                              </div>
                            </div>
                            <div className="review-rating">{renderStars(review.rating || 0)}</div>
                          </div>
                          {review.comment && <p className="review-comment">{review.comment}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="cta-box">
                {isEnrolled ? (
                  <button
                    className="btn-start"
                    onClick={() => handleSelectVideo(course.videos[0])}
                  >
                    ▶️ Bắt đầu học
                  </button>
                ) : (
                  course.quizzes?.length > 0 && (
                    <button
                      className="btn-start"
                      onClick={() => handleSelectQuiz(course.quizzes[0])}
                    >
                      ▶️ Bắt đầu làm bài tập
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <StudentChatBubble courseId={courseId} />
    </div>
  );
}

export default CourseLearn;
