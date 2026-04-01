import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseService, orderService } from '../services/apiService';
import Layout from '../components/Layout';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalStudents: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseReviews, setCourseReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ averageRating: 0, reviewCount: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const loadCourseReviews = useCallback(async (courseId) => {
    if (!courseId) return;
    try {
      setReviewsLoading(true);
      const response = await courseService.getReviews(courseId);
      setCourseReviews(response.data || []);
      setReviewMeta(response.meta || { averageRating: 0, reviewCount: 0 });
    } catch (error) {
      console.error('❌ Error loading course reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseReviews(selectedCourseId);
    }
  }, [selectedCourseId, loadCourseReviews]);

  const fetchDashboardData = async () => {
    try {
      const [coursesData, ordersData] = await Promise.all([
        courseService.getAll(),
        orderService.getAll(),
      ]);

      console.log('📊 Dashboard - Courses:', coursesData);
      console.log('📊 Dashboard - Orders:', ordersData);

      const courses = coursesData.data || [];
      const orders = ordersData.data || [];

      console.log('📊 Courses array:', courses);
      console.log('📊 Orders array:', orders);

      // Calculate stats
      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.amount, 0);

      const totalStudents = courses.reduce((sum, course) => 
        sum + (course.students?.length || 0), 0
      );

      setStats({
        totalCourses: courses.length,
        totalOrders: orders.length,
        totalRevenue,
        totalStudents,
      });

      setRecentOrders(orders.slice(0, 5));
      setCourses(courses);
      if (!selectedCourseId && courses[0]?._id) {
        setSelectedCourseId(courses[0]._id);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (event) => {
    setSelectedCourseId(event.target.value);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!selectedCourseId || !reviewId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;

    try {
      setDeletingReviewId(reviewId);
      await courseService.deleteReview(selectedCourseId, reviewId);
      await loadCourseReviews(selectedCourseId);
    } catch (error) {
      console.error('❌ Error deleting review:', error);
      alert(error?.response?.data?.error || 'Không thể xóa đánh giá.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const renderStars = (value = 0) => (
    <div className="admin-review-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={value >= star ? 'filled' : 'empty'}>★</span>
      ))}
    </div>
  );

  const formatReviewDate = (value) => {
    if (!value) return 'Không rõ thời gian';
    try {
      return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Invalid review date:', value, error);
      return 'Không rõ thời gian';
    }
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
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>📊 Admin Dashboard</h1>
          <p>Chào mừng trở lại, {user?.name}!</p>
        </div>
      
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{stats.totalCourses}</h3>
              <p>Tổng khóa học</p>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{stats.totalStudents}</h3>
              <p>Tổng học viên</p>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{stats.totalOrders}</h3>
              <p>Đơn hàng</p>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>{stats.totalRevenue.toLocaleString('vi-VN')}đ</h3>
              <p>Doanh thu</p>
            </div>
          </div>
        </div>

        <div className="recent-orders">
          <h2>📋 Đơn hàng gần đây</h2>
          {recentOrders.length === 0 ? (
            <div className="empty-state">Chưa có đơn hàng nào</div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khóa học</th>
                  <th>Người mua</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td>#{order._id.slice(-6)}</td>
                    <td>{order.courseId?.title || 'N/A'}</td>
                    <td>{order.userId?.name || 'N/A'}</td>
                    <td className="amount">{order.amount.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={`status ${order.status}`}>
                        {order.status === 'completed' ? '✅ Hoàn thành' : 
                         order.status === 'pending' ? '⏳ Chờ xử lý' : 
                         '❌ Thất bại'}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="reviews-management">
          <div className="reviews-management-header">
            <div>
              <h2>⭐️ Quản lý đánh giá khóa học</h2>
              <p>Chọn khóa học để xem phản hồi và xử lý đánh giá không phù hợp.</p>
            </div>
            <button
              type="button"
              className="reviews-refresh"
              onClick={() => selectedCourseId && loadCourseReviews(selectedCourseId)}
              disabled={!selectedCourseId || reviewsLoading}
            >
              {reviewsLoading ? 'Đang tải...' : '🔄 Làm mới'}
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state">Chưa có khóa học nào để hiển thị đánh giá.</div>
          ) : (
            <>
              <div className="reviews-controls">
                <label>
                  Khóa học
                  <select value={selectedCourseId} onChange={handleCourseChange}>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedCourseId && (
                  <div className="reviews-metrics-card">
                    <div>
                      <span className="reviews-metrics-value">{(reviewMeta?.averageRating || 0).toFixed(1)}</span>
                      <span className="reviews-metrics-label">Điểm trung bình</span>
                    </div>
                    <div>
                      <span className="reviews-metrics-count">{reviewMeta?.reviewCount || 0}</span>
                      <span className="reviews-metrics-label">Lượt đánh giá</span>
                    </div>
                    {renderStars(Math.round(reviewMeta?.averageRating || 0))}
                  </div>
                )}
              </div>

              {selectedCourseId && (
                <div className="reviews-table">
                  {reviewsLoading ? (
                    <div className="empty-state">Đang tải danh sách đánh giá...</div>
                  ) : courseReviews.length === 0 ? (
                    <div className="empty-state">
                      Chưa có đánh giá nào cho khóa học này.
                    </div>
                  ) : (
                    courseReviews.map((review) => (
                      <div key={review._id} className="admin-review-card">
                        <div className="admin-review-header">
                          <div>
                            <p className="review-owner">{review.student?.name || 'Học viên ẩn danh'}</p>
                            <span className="review-owner-email">{review.student?.email || 'Không có email'}</span>
                          </div>
                          <div className="admin-review-rating">
                            <strong>{review.rating?.toFixed(1)}</strong>
                            {renderStars(Math.round(review.rating || 0))}
                          </div>
                        </div>
                        <p className="admin-review-comment">{review.comment || 'Không có nhận xét bổ sung.'}</p>
                        <div className="admin-review-footer">
                          <span>{formatReviewDate(review.createdAt)}</span>
                          <button
                            type="button"
                            className="review-delete-btn"
                            onClick={() => handleDeleteReview(review._id)}
                            disabled={deletingReviewId === review._id}
                          >
                            {deletingReviewId === review._id ? 'Đang xóa...' : '🗑️ Xóa đánh giá'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
