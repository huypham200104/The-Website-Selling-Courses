import React, { useState, useEffect } from 'react';
import { orderService } from '../services/apiService';
import Layout from '../components/Layout';
import './Orders.css';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    const params = {};
    if (filter !== 'all') params.status = filter;
    if (searchTerm) params.search = searchTerm;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    orderService.getAll(params)
      .then((data) => setOrders(data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const handleApplyFilter = (e) => {
    e?.preventDefault();
    fetchOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      alert('Cập nhật trạng thái thành công!');
      fetchOrders();
      if (detailOrder && detailOrder._id === orderId) {
        setDetailOrder((o) => (o ? { ...o, status: newStatus } : null));
      }
    } catch (err) {
      alert('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { icon: '✅', text: 'Hoàn thành', class: 'completed' },
      pending: { icon: '⏳', text: 'Chờ xử lý', class: 'pending' },
      failed: { icon: '❌', text: 'Thất bại', class: 'failed' },
    };
    return badges[status] || badges.pending;
  };

  const exportCSV = () => {
    const headers = ['Mã đơn', 'Khóa học', 'Khách hàng', 'Email', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày tạo'];
    const rows = orders.map((o) => [
      o._id,
      o.courseId?.title || '',
      o.userId?.name || '',
      o.userId?.email || '',
      o.amount,
      o.paymentMethod || '',
      o.status,
      o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `don-hang-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.amount, 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const successRate = orders.length ? ((orders.filter((o) => o.status === 'completed').length / orders.length) * 100).toFixed(1) : 0;

  return (
    <Layout>
      <div className="orders-page">
        <div className="page-header">
          <h1>💰 Quản lý Đơn hàng</h1>
          <button type="button" className="btn-primary" onClick={exportCSV}>Xuất CSV</button>
        </div>

        <form className="orders-filter-form" onSubmit={handleApplyFilter}>
          <input
            type="text"
            placeholder="Tìm theo email, tên, mã đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button type="submit" className="btn-primary">Lọc</button>
        </form>

        <div className="filter-tabs">
          {['all', 'pending', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              type="button"
              className={filter === s ? 'active' : ''}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'Tất cả' : s === 'pending' ? 'Chờ xử lý' : s === 'completed' ? 'Hoàn thành' : 'Thất bại'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
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
                  {orders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    return (
                      <tr key={order._id}>
                        <td>
                          <button type="button" className="link-code" onClick={() => setDetailOrder(order)} title="Xem chi tiết">
                            #{order._id.slice(-8)}
                          </button>
                        </td>
                        <td>{order.courseId?.title || 'N/A'}</td>
                        <td>{order.userId?.name || order.userId?.email || 'N/A'}</td>
                        <td><strong>{Number(order.amount).toLocaleString('vi-VN')}đ</strong></td>
                        <td>{order.paymentMethod || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${badge.class}`}>{badge.icon} {badge.text}</span>
                        </td>
                        <td>{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}</td>
                        <td>
                          {order.status === 'pending' && (
                            <div className="action-buttons">
                              <button type="button" className="btn-approve" onClick={() => handleStatusChange(order._id, 'completed')} title="Duyệt đơn">✅</button>
                              <button type="button" className="btn-reject" onClick={() => handleStatusChange(order._id, 'failed')} title="Từ chối">❌</button>
                            </div>
                          )}
                          {order.status !== 'pending' && (
                            <button type="button" className="link-code" onClick={() => setDetailOrder(order)}>Chi tiết</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {orders.length === 0 && (
              <div className="empty-state"><p>Không có đơn hàng nào</p></div>
            )}

            <div className="orders-summary">
              <div className="summary-card">
                <h3>Tổng doanh thu</h3>
                <p className="summary-value">{totalRevenue.toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="summary-card">
                <h3>Đơn chờ xử lý</h3>
                <p className="summary-value pending-count">{pendingCount}</p>
              </div>
              <div className="summary-card">
                <h3>Tỷ lệ thành công</h3>
                <p className="summary-value">{successRate}%</p>
              </div>
            </div>
          </>
        )}

        {detailOrder && (
          <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
            <div className="modal order-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Chi tiết đơn hàng #{detailOrder._id.slice(-8)}</h2>
                <button type="button" className="close-btn" onClick={() => setDetailOrder(null)}>✕</button>
              </div>
              <div className="order-detail-body">
                <p><strong>Khóa học:</strong> {detailOrder.courseId?.title || 'N/A'}</p>
                <p><strong>Khách hàng:</strong> {detailOrder.userId?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {detailOrder.userId?.email || 'N/A'}</p>
                <p><strong>Số tiền:</strong> {Number(detailOrder.amount).toLocaleString('vi-VN')}đ</p>
                <p><strong>Phương thức:</strong> {detailOrder.paymentMethod || 'N/A'}</p>
                <p><strong>Trạng thái:</strong>{' '}
                  <span className={`status-badge ${getStatusBadge(detailOrder.status).class}`}>
                    {getStatusBadge(detailOrder.status).icon} {getStatusBadge(detailOrder.status).text}
                  </span>
                </p>
                <p><strong>Ngày tạo:</strong> {detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString('vi-VN') : '-'}</p>
                {detailOrder.status === 'pending' && (
                  <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button type="button" className="btn-approve" onClick={() => handleStatusChange(detailOrder._id, 'completed')}>Duyệt đơn</button>
                    <button type="button" className="btn-reject" onClick={() => handleStatusChange(detailOrder._id, 'failed')}>Từ chối</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Orders;
