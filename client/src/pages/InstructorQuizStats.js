import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService, courseService } from '../services/apiService';
import './InstructorQuizStats.css';

function InstructorQuizStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // For aggregating stats
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScorePct: 0,
    passCount: 0,
    failCount: 0
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseRes, resultsRes] = await Promise.all([
        courseService.getOne(id),
        quizService.getCourseResults(id)
      ]);
      
      setCourse(courseRes.data);
      
      const data = resultsRes.data || [];
      setResults(data);

      if (data.length > 0) {
        let totalPct = 0;
        let pass = 0;
        let fail = 0;

        data.forEach(r => {
          totalPct += r.percentage;
          if (r.percentage >= 50) {
            pass++;
          } else {
            fail++;
          }
        });

        setStats({
          totalAttempts: data.length,
          averageScorePct: Math.round(totalPct / data.length),
          passCount: pass,
          failCount: fail
        });
      }

    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
      alert('Không thể tải dữ liệu thống kê');
      navigate('/instructor/courses');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  if (loading) return <div className="loading">Đang tải thống kê...</div>;
  if (!course) return <div className="error-message">Không tìm thấy khóa học</div>;

  return (
    <div className="quiz-stats-page">
      <header className="stats-header">
        <button className="btn-back" onClick={() => navigate(`/instructor/courses/${id}`)}>
          ← Quay lại chi tiết khóa học
        </button>
        <div className="header-info">
          <h2>Thống kê làm bài tập</h2>
          <p className="course-name">{course.title}</p>
        </div>
      </header>

      <main className="stats-container">
        {/* Statistics Cards */}
        <div className="stats-cards-grid">
          <div className="stat-card">
            <div className="stat-icon attempts-icon">📝</div>
            <div className="stat-content">
              <h3>Tổng lượt làm bài</h3>
              <p className="stat-number">{stats.totalAttempts}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon avg-icon">📊</div>
            <div className="stat-content">
              <h3>Điểm trung bình</h3>
              <p className="stat-number">{stats.averageScorePct}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pass-icon">✅</div>
            <div className="stat-content">
              <h3>Số lượt Đạt (&ge;50%)</h3>
              <p className="stat-number text-success">{stats.passCount}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon fail-icon">❌</div>
            <div className="stat-content">
              <h3>Chưa đạt (&lt;50%)</h3>
              <p className="stat-number text-danger">{stats.failCount}</p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="results-table-section">
          <h3>Chi tiết kết quả học viên</h3>
          
          {results.length === 0 ? (
            <div className="empty-results">
              <p>Chưa có học viên nào làm bài kiểm tra trong khóa học này.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="instructor-results-table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Bài kiểm tra</th>
                    <th>Điểm</th>
                    <th>Phần trăm</th>
                    <th>Kết quả</th>
                    <th>Thời gian nộp</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id}>
                      <td>
                        <div className="student-info">
                          <img 
                            src={result.student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.student?.name || 'User')}&background=random`} 
                            alt="avatar" 
                            className="student-avatar" 
                          />
                          <div>
                            <p className="student-name">{result.student?.name || 'N/A'}</p>
                            <p className="student-email">{result.student?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="quiz-name">{result.quizTitle}</td>
                      <td className="score-val"><strong>{result.score}</strong> / {result.totalQuestions}</td>
                      <td>
                        <span className={`pct-badge ${result.percentage >= 50 ? 'pct-pass' : 'pct-fail'}`}>
                          {result.percentage}%
                        </span>
                      </td>
                      <td>
                        {result.percentage >= 80 ? (
                           <span className="status-badge status-excellent">Xuất sắc</span>
                        ) : result.percentage >= 50 ? (
                           <span className="status-badge status-pass">Đạt</span>
                        ) : (
                           <span className="status-badge status-fail">Không đạt</span>
                        )}
                      </td>
                      <td className="submit-time">{formatDate(result.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default InstructorQuizStats;
