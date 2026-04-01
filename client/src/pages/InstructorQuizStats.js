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
      } else {
        setStats({ totalAttempts: 0, averageScorePct: 0, passCount: 0, failCount: 0 });
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

  const handleGrade = async (result) => {
    const input = prompt(`Nhập điểm cho ${result.student?.name || 'học viên'} (1-10)`, result.score ?? '');
    if (input === null) return;
    const score = Number(String(input).trim());
    if (Number.isNaN(score) || score < 1 || score > 10) {
      alert('Điểm không hợp lệ');
      return;
    }
    try {
      const response = await quizService.gradeResult(result._id, score);
      if (response?.success) {
        setResults((prev) => prev.map((r) => r._id === result._id ? response.data : r));
        // refresh stats quickly
        fetchData();
      }
    } catch (error) {
      console.error('Lỗi chấm điểm:', error);
      alert(error?.response?.data?.message || 'Chấm điểm thất bại');
    }
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
                    <th>Trạng thái</th>
                    <th>Bài làm</th>
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
                      <td className="score-val"><strong>{result.score}</strong> / 10</td>
                      <td>
                        {result.status === 'graded' ? (
                          <div className="progress-bar-container">
                            <div 
                              className={`progress-bar-fill ${result.percentage >= 80 ? 'excellent' : result.percentage >= 50 ? 'good' : 'poor'}`} 
                              style={{ width: `${Math.max(result.percentage, 5)}%` }}
                            ></div>
                            <span className="progress-text">{result.percentage}%</span>
                          </div>
                        ) : (
                          <span className="progress-text" style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        {result.status === 'graded' ? (
                          result.score > 5 ? (
                            <span className="status-badge status-pass">Đạt (&gt;5/10)</span>
                          ) : (
                            <span className="status-badge status-fail">Chưa đạt (&le;5/10)</span>
                          )
                        ) : (
                          <span className="status-badge status-pending">Chờ chấm</span>
                        )}
                      </td>
                      <td className="essay-link">
                        {result.answers && Object.keys(result.answers).length > 0 ? (
                          Object.values(result.answers).map((val, idx) => (
                            typeof val === 'string' ? (
                              <div key={idx}><a href={val} target="_blank" rel="noreferrer">Link bài {idx + 1}</a></div>
                            ) : (
                              <div key={idx}>Câu {idx + 1}: {JSON.stringify(val)}</div>
                            )
                          ))
                        ) : '—'}
                      </td>
                      <td className="submit-time">
                        <div>{formatDate(result.createdAt)}</div>
                        {result.status === 'graded' && (
                          <div className="graded-meta">Đã chấm bởi {result.gradedBy?.name || 'Giảng viên'}{result.gradedAt ? ` (${formatDate(result.gradedAt)})` : ''}</div>
                        )}
                        <button className="btn-grade" onClick={() => handleGrade(result)}>
                          {result.status === 'graded' ? 'Chấm lại' : 'Chấm điểm'}
                        </button>
                      </td>
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
