import React, { useState, useEffect } from 'react';
import { userService } from '../services/apiService';
import Layout from '../components/Layout';
import './Users.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'student' });
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'student' });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadUsers = () => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filter !== 'all') params.role = filter;

    userService.getAll(params)
      .then((res) => {
        setUsers(res.data || []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total ?? 0);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [page, filter, debouncedSearch]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    try {
      await userService.delete(id);
      alert('Xóa người dùng thành công!');
      loadUsers();
    } catch (e) {
      alert('Không thể xóa người dùng');
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.update(editingUser._id, { 
        name: editForm.name, 
        email: editForm.email, 
        role: editForm.role 
      });
      alert('✅ Cập nhật người dùng thành công!');
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Cập nhật thất bại';
      alert(`❌ ${msg}`);
    }
  };

  const openAdd = () => {
    setAddForm({ name: '', email: '', password: '', role: 'student' });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.create(addForm);
      alert('Thêm người dùng thành công!');
      setShowAddModal(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Thêm thất bại');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { icon: '👨‍💼', text: 'Admin', class: 'admin' },
      instructor: { icon: '👨‍🏫', text: 'Instructor', class: 'instructor' },
      student: { icon: '👨‍🎓', text: 'Student', class: 'student' },
    };
    return badges[role] || badges.student;
  };

  return (
    <Layout>
      <div className="users-page">
        <div className="page-header">
          <h1>👥 Quản lý người dùng</h1>
          <button type="button" className="btn-primary" onClick={openAdd}>+ Thêm người dùng</button>
        </div>

        <div className="users-controls">
          <div className="filter-buttons">
            {['all', 'admin', 'instructor', 'student'].map((r) => (
              <button
                key={r}
                type="button"
                className={filter === r ? 'filter-btn active' : 'filter-btn'}
                onClick={() => { setFilter(r); setPage(1); }}
              >
                {r === 'all' ? 'Tất cả' : r === 'admin' ? 'Admin' : r === 'instructor' ? 'Instructor' : 'Student'}
              </button>
            ))}
          </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
            <div className="users-grid">
              {users.map((user) => {
                const badge = getRoleBadge(user.role);
                return (
                  <div key={user._id} className="user-card">
                    <img src={user.avatar} alt="" className="user-avatar" onError={(e) => { e.target.style.display = 'none'; }} />
                    <div className="user-info">
                      <h3>{user.name}</h3>
                      <p className="user-email">{user.email}</p>
                      <span className={`role-badge ${badge.class}`}>{badge.icon} {badge.text}</span>
                      <div className="user-stats">
                        <span>📚 {user.purchasedCourses?.length || 0} khóa học</span>
                        <span>📅 {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button type="button" className="btn-edit" onClick={() => openEdit(user)} title="Sửa">✏️</button>
                      <button type="button" className="btn-delete" onClick={() => handleDeleteUser(user._id)}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
                <span>Trang {page} / {totalPages} ({total} người dùng)</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
              </div>
            )}

            {users.length === 0 && (
              <div className="empty-state">
                <p>Không tìm thấy người dùng nào</p>
              </div>
            )}
          </>
        )}

        {showEditModal && editingUser && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✏️ Sửa người dùng</h2>
                <button type="button" className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Tên</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Cập nhật</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>👤 Thêm người dùng</h2>
                <button type="button" className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="form-group">
                  <label>Tên *</label>
                  <input type="text" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Mật khẩu *</label>
                  <input type="password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Thêm</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Users;
