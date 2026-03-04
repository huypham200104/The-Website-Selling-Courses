import React, { useState, useEffect } from 'react';
import { orderService } from '../services/apiService';
import Layout from '../components/Layout';
import './Orders.css';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed, failed

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAll();
      console.log('📦 Orders response:', data);
      console.log('📦 Orders data array:', data.data);
      setOrders(data.data || []);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      console.error('Error details:', error.response?.data);
      alert('Không thể tải danh sách đơn hàng: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      alert('Cập nhật trạng thái thành công!');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      completed: { icon: '✅', text: 'Hoàn thành', class: 'completed' },
      pending: { icon: '⏳', text: 'Chờ xử lý', class: 'pending' },
      failed: { icon: '❌', text: 'Thất bại', class: 'failed' },
    };
    return badges[status] || badges.pending;
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
      <div className="orders-page">
        <h1>💰 Quản lý Đơn hàng</h1>

      {/* Filter */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Tất cả ({orders.length})
        </button>
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Chờ xử lý ({orders.filter(o => o.status === 'pending').length})
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Hoàn thành ({orders.filter(o => o.status === 'completed').length})
        </button>
        <button
          className={filter === 'failed' ? 'active' : ''}
          onClick={() => setFilter('failed')}
        >
          Thất bại ({orders.filter(o => o.status === 'failed').length})
        </button>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khóa học</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const badge = getStatusBadge(order.status);
              return (
                <tr key={order._id}>
                  <td>
                    <code>#{order._id.slice(-8)}</code>
                  </td>
                  <td>
                    {order.courseId?.title || 'N/A'}
                  </td>
                  <td>
                    {order.userId?.name || order.userId?.email || 'N/A'}
                  </td>
                  <td>
                    <strong>{order.amount.toLocaleString('vi-VN')}đ</strong>
                  </td>
                  <td>{order.paymentMethod || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${badge.class}`}>
                      {badge.icon} {badge.text}
                    </span>
                  </td>
                  <td>
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    {order.status === 'pending' && (
                      <div className="action-buttons">
                        <button
                          className="btn-approve"
                          onClick={() => handleStatusChange(order._id, 'completed')}
                          title="Duyệt đơn"
                        >
                          ✅
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleStatusChange(order._id, 'failed')}
                          title="Từ chối"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                    {order.status !== 'pending' && (
                      <span className="no-action">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="empty-state">
            <p>Không có đơn hàng nào</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="orders-summary">
        <div className="summary-card">
          <h3>Tổng doanh thu</h3>
          <p className="summary-value">
            {orders
              .filter(o => o.status === 'completed')
              .reduce((sum, o) => sum + o.amount, 0)
              .toLocaleString('vi-VN')}đ
          </p>
        </div>
        <div className="summary-card">
          <h3>Đơn chờ xử lý</h3>
          <p className="summary-value pending-count">
            {orders.filter(o => o.status === 'pending').length}
          </p>
        </div>
        <div className="summary-card">
          <h3>Tỷ lệ thành công</h3>
          <p className="summary-value">
            {orders.length > 0 
              ? ((orders.filter(o => o.status === 'completed').length / orders.length) * 100).toFixed(1)
              : 0}%
          </p>
        </div>
      </div>
      </div>
    </Layout>
  );
}

export default Orders;
