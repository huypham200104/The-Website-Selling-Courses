import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
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
      </div>
    </Layout>
  );
}

export default Dashboard;
