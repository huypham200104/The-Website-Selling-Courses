import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { orderService, statsService } from '../services/apiService';
import Layout from '../components/Layout';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalStudents: 0,
    revenueByMonth: [],
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const statsParams = {};
      if (dateFrom) statsParams.from = dateFrom;
      if (dateTo) statsParams.to = dateTo;

      const [statsRes, ordersRes] = await Promise.all([
        statsService.getAdminStats(statsParams).catch(() => ({ data: {} })),
        orderService.getAll(params),
      ]);

      const data = statsRes.data || {};
      const orders = ordersRes.data || [];

      setStats({
        totalCourses: data.totalCourses ?? 0,
        totalOrders: data.totalOrders ?? 0,
        totalRevenue: data.totalRevenue ?? 0,
        totalStudents: data.totalStudents ?? 0,
        revenueByMonth: data.revenueByMonth || [],
      });
      setRecentOrders(orders.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilter = (e) => {
    e?.preventDefault();
    loadData();
  };

  const exportCSV = () => {
    const headers = ['Mã đơn', 'Khóa học', 'Người mua', 'Số tiền', 'Trạng thái', 'Ngày'];
    const rows = recentOrders.map((o) => [
      o._id,
      o.courseId?.title || '',
      o.userId?.name || o.userId?.email || '',
      o.amount,
      o.status,
      new Date(o.createdAt).toLocaleString('vi-VN'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `don-hang-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading && recentOrders.length === 0) {
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

        <form className="dashboard-filter" onSubmit={handleApplyFilter}>
          <label>
            Từ ngày
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">Áp dụng</button>
        </form>

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
              <h3>{Number(stats.totalRevenue).toLocaleString('vi-VN')}đ</h3>
              <p>Doanh thu</p>
            </div>
          </div>
        </div>

        {stats.revenueByMonth && stats.revenueByMonth.length > 0 && (
          <div className="dashboard-section chart-section">
            <h2>📈 Doanh thu theo tháng</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.revenueByMonth}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString('vi-VN')}đ`, 'Doanh thu']} />
                <Bar dataKey="revenue" fill="#667eea" radius={[4, 4, 0, 0]}>
                  {stats.revenueByMonth.map((_, i) => (
                    <Cell key={i} fill="#667eea" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="recent-orders">
          <div className="recent-orders-header">
            <h2>📋 Đơn hàng gần đây</h2>
            <button type="button" className="btn-export" onClick={exportCSV}>
              Xuất CSV
            </button>
          </div>
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
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>#{order._id.slice(-6)}</td>
                    <td>{order.courseId?.title || 'N/A'}</td>
                    <td>{order.userId?.name || 'N/A'}</td>
                    <td className="amount">{order.amount.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={`status ${order.status}`}>
                        {order.status === 'completed' ? '✅ Hoàn thành' : order.status === 'pending' ? '⏳ Chờ xử lý' : '❌ Thất bại'}
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
