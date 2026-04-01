import React, { useState, useEffect } from 'react';
import { userService } from '../services/apiService';
import Layout from '../components/Layout';
import './Users.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, admin, instructor, student
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    avatar: ''
  });

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userService.getAll();
      console.log('👥 Users response:', response);
      setUsers(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', error.response?.data);
      alert('Không thể tải danh sách người dùng: ' + (error.response?.data?.error || error.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await userService.create(formData);
      alert('Tạo giảng viên thành công!');
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', avatar: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating instructor:', error);
      alert(error.response?.data?.error || 'Không thể tạo giảng viên');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        await userService.delete(id);
        alert('Xóa người dùng thành công!');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Không thể xóa người dùng');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRoleBadge = (role) => {
    const badges = {
      admin: { icon: '👨‍💼', text: 'Admin', class: 'admin' },
      instructor: { icon: '👨‍🏫', text: 'Instructor', class: 'instructor' },
      student: { icon: '👨‍🎓', text: 'Student', class: 'student' },
    };
    return badges[role] || badges.student;
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
      <div className="users-page">
        <div className="page-header">
          <h1>👥 Quản lý người dùng</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            ➕ Thêm giảng viên
          </button>
        </div>

        {/* Filters and Search */}
        <div className="users-controls">
          <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('all')}
            >
              Tất cả ({users.length})
            </button>
            <button
              className={filter === 'admin' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('admin')}
            >
              Admin ({users.filter(u => u.role === 'admin').length})
            </button>
            <button
              className={filter === 'instructor' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('instructor')}
            >
              Instructor ({users.filter(u => u.role === 'instructor').length})
            </button>
            <button
              className={filter === 'student' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('student')}
            >
              Student ({users.filter(u => u.role === 'student').length})
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="users-grid">
          {filteredUsers.map(user => {
            const badge = getRoleBadge(user.role);
            return (
              <div key={user._id} className="user-card">
                <img src={user.avatar} alt={user.name} className="user-avatar" />
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <p className="user-email">{user.email}</p>
                  <span className={`role-badge ${badge.class}`}>
                    {badge.icon} {badge.text}
                  </span>
                  <div className="user-stats">
                    <span>📚 {user.purchasedCourses?.length || 0} khóa học</span>
                    <span>📅 {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                {user.role !== 'admin' && (
                  <div className="user-actions">
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <p>Không tìm thấy người dùng nào</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h3>Thêm giảng viên</h3>
                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreate} className="modal-body">
                <div className="form-group">
                  <label>Họ tên *</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Mật khẩu *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Avatar (URL)</label>
                  <input name="avatar" value={formData.avatar} onChange={handleInputChange} placeholder="https://..." />
                </div>
                <p style={{ fontSize: '0.9rem', color: '#555' }}>Role mặc định: Instructor (do admin cấp).</p>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Tạo giảng viên</button>
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
