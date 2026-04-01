import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { courseService } from '../services/apiService';
import './AdminReports.css';

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await courseService.getReports();
        setReports(res.data || []);
      } catch (err) {
        console.error('Load reports error', err);
        const msg = err?.response?.data?.error || err?.response?.data?.message || 'Không tải được báo cáo';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Layout>
      <div className="reports-page">
        <div className="reports-header">
          <div>
            <h1>🚩 Báo cáo khóa học</h1>
            <p>Danh sách báo cáo do học viên gửi</p>
          </div>
          <span className="reports-count">{reports.length} báo cáo</span>
        </div>

        {error && <div className="reports-error">⚠️ {error}</div>}
        {loading ? (
          <div className="reports-loading">Đang tải...</div>
        ) : reports.length === 0 ? (
          <div className="reports-empty">Chưa có báo cáo nào</div>
        ) : (
          <div className="reports-table" role="table">
            <div className="reports-row head" role="row">
              <div role="columnheader">Khóa học</div>
              <div role="columnheader">Học viên</div>
              <div role="columnheader">Liên hệ</div>
              <div role="columnheader">Lý do</div>
              <div role="columnheader">Chi tiết</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Ngày</div>
            </div>
            {reports.map((r) => (
              <div className="reports-row" role="row" key={r._id}>
                <div role="cell">
                  <div className="cell-title">{r.course?.title || 'N/A'}</div>
                  <div className="cell-sub">GV: {r.instructor?.name || 'N/A'}</div>
                </div>
                <div role="cell">
                  <div className="cell-title">{r.student?.name || 'Học viên'}</div>
                  <div className="cell-sub">{r.student?.email}</div>
                </div>
                <div role="cell">
                  {r.contactPhone || '—'}
                </div>
                <div role="cell">{r.reason}</div>
                <div role="cell" className="cell-message">{r.message || '—'}</div>
                <div role="cell">
                  <span className={`status-badge ${r.status}`}>{r.status}</span>
                </div>
                <div role="cell">{new Date(r.createdAt).toLocaleString('vi-VN')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdminReports;
