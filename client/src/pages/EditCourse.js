import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './CreateCourse.css'; // Reusing create course styling

function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    level: 'beginner',
    thumbnail: ''
  });

  useEffect(() => {
    fetchCourse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await courseService.getOne(id);
      const course = response.data;
      setFormData({
        title: course.title || '',
        description: course.description || '',
        price: course.price || 0,
        category: course.category || '',
        level: course.level || 'beginner',
        thumbnail: course.thumbnail || ''
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Không tìm thấy khóa học để chỉnh sửa');
      navigate('/instructor/courses');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await courseService.update(id, {
        ...formData,
        price: Number(formData.price)
      });
      
      alert('Cập nhật khóa học thành công! 🎉');
      navigate('/instructor/courses');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Có lỗi xảy ra khi cập nhật khóa học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Layout><div className="loading">Đang tải thông tin khóa học...</div></Layout>;
  }

  return (
    <Layout>
      <div className="create-course-page">
        <div className="page-header">
          <h1>✏️ Chỉnh sửa khóa học</h1>
          <p>Cập nhật thông tin chi tiết về khóa học của bạn</p>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>📝 Thông tin cơ bản</h2>
              
              <div className="form-group">
                <label htmlFor="title">
                  Tên khóa học <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ví dụ: Lập trình React từ cơ bản đến nâng cao"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Mô tả <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Mô tả chi tiết về khóa học, nội dung, đối tượng học viên..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">
                    Danh mục <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Ví dụ: Web Development, Design, Marketing..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="level">
                    Độ khó <span className="required">*</span>
                  </label>
                  <select
                    id="level"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    required
                  >
                    <option value="beginner">Beginner - Người mới bắt đầu</option>
                    <option value="intermediate">Intermediate - Trung cấp</option>
                    <option value="advanced">Advanced - Nâng cao</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>💰 Giá và hình ảnh</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">
                    Giá khóa học (VNĐ) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="500000"
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="thumbnail">
                    URL hình ảnh thumbnail <span className="required">*</span>
                  </label>
                  <input
                    type="url"
                    id="thumbnail"
                    name="thumbnail"
                    value={formData.thumbnail}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>
              </div>

              {formData.thumbnail && (
                <div className="thumbnail-preview">
                  <p>Preview:</p>
                  <img src={formData.thumbnail} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate('/instructor/courses')}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default EditCourse;
