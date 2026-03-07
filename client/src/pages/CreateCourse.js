import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './CreateCourse.css';

function CreateCourse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    level: 'beginner',
    thumbnail: ''
  });

  const isAdmin = user?.role === 'admin';
  const redirectPath = isAdmin ? '/courses' : '/instructor/courses';

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
      await courseService.create({
        ...formData,
        price: Number(formData.price)
      });
      
      alert('Tạo khóa học thành công! 🎉');
      navigate(redirectPath);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Có lỗi xảy ra khi tạo khóa học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="create-course-page">
        <div className="page-header">
          <h1>➕ Tạo khóa học mới</h1>
          <p>Chia sẻ kiến thức của bạn với học viên trên toàn thế giới</p>
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
                <small>Tên khóa học nên rõ ràng và hấp dẫn</small>
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
                <small>Mô tả giúp học viên hiểu rõ về khóa học của bạn</small>
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
                  <small>Giá bằng 0 = Miễn phí</small>
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
                  <small>Link ảnh từ internet (jpg, png)</small>
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
                onClick={() => navigate(redirectPath)}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? '⏳ Đang tạo...' : '✅ Tạo khóa học'}
              </button>
            </div>
          </form>

          <div className="help-section">
            <h3>💡 Gợi ý</h3>
            <ul>
              <li>Tên khóa học nên ngắn gọn, dễ hiểu và hấp dẫn</li>
              <li>Mô tả chi tiết giúp tăng tỷ lệ đăng ký</li>
              <li>Chọn thumbnail đẹp, chất lượng cao</li>
              <li>Định giá hợp lý dựa trên giá trị nội dung</li>
              <li>Sau khi tạo khóa học, bạn có thể thêm video và tài liệu</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreateCourse;
