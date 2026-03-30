import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/apiService';
import StudentHeader from '../components/StudentHeader';
import Footer from '../components/Footer';
import './StudentQuizResults.css';

function StudentQuizResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await quizService.getMyResults();
      if (response.success) {
        setResults(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải kết quả:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  return (
    <div className="quiz-results-page">
      <StudentHeader customActiveTab="results" />
      
      <main className="quiz-results-container">
        <div className="page-heading">
          <h2>📊 Kết quả bài kiểm tra</h2>
          <p>Xem lại lịch sử và điểm số các bài kiểm tra trắc nghiệm bạn đã hoàn thành.</p>
        </div>

        {loading ? (
          <div className="loading-state">Đang tải dữ liệu...</div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📝</span>
            <p>Bạn chưa làm bài kiểm tra nào.</p>
            <button className="btn-go-learn" onClick={() => navigate('/student/dashboard')}>
              Khám phá khóa học
            </button>
          </div>
        ) : (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Bài kiểm tra</th>
                  <th>Ngày làm bài</th>
                  <th>Điểm số</th>
                  <th>Phần trăm</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id}>
                    <td>
                      <div className="course-cell">
                        {result.course?.thumbnail && (
                          <img src={result.course.thumbnail} alt={result.course.title} className="small-thumb" />
                        )}
                        <span>{result.course?.title || 'Khóa học đã xóa'}</span>
                      </div>
                    </td>
                    <td className="quiz-title-cell">{result.quizTitle}</td>
                    <td>{formatDate(result.createdAt)}</td>
                    <td className="score-cell">
                      <strong>{result.score}</strong> / {result.totalQuestions}
                    </td>
                    <td>
                      <div className="progress-bar-container">
                        <div 
                          className={`progress-bar-fill ${result.percentage >= 80 ? 'excellent' : result.percentage >= 50 ? 'good' : 'poor'}`} 
                          style={{ width: `${Math.max(result.percentage, 5)}%` }}
                        ></div>
                        <span className="progress-text">{result.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {result.percentage >= 80 ? (
                        <span className="badge badge-success">Xuất sắc</span>
                      ) : result.percentage >= 50 ? (
                        <span className="badge badge-warning">Đạt</span>
                      ) : (
                        <span className="badge badge-error">Cần cải thiện</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default StudentQuizResults;
