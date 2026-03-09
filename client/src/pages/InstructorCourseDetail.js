import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './InstructorCourseDetail.css';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

function InstructorCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    file: null
  });

  useEffect(() => {
    fetchCourseDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await courseService.getOne(id);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Không tìm thấy khóa học');
      navigate('/instructor/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setVideoForm(prev => ({ ...prev, file: files[0] }));
    } else {
      setVideoForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.file || !videoForm.title) {
      return alert('Vui lòng nhập tên video và chọn file');
    }

    const file = videoForm.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadedChunks = [];

    setUploading(true);
    setProgress(0);
    setProgressText('Đang chuẩn bị upload...');

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('fileName', fileName);

        setProgressText(`Đang tải lên phần ${i + 1}/${totalChunks}...`);
        
        const response = await videoAPI.uploadChunk(formData);
        uploadedChunks.push(response.data.chunkPath);
        
        const percentCompleted = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(percentCompleted);
      }

      setProgressText('Đang xử lý và gộp file trên server. Vui lòng đợi...');
      setProgress(100);

      await videoAPI.mergeChunks({
        fileName,
        chunks: uploadedChunks,
        courseId: course._id,
        title: videoForm.title,
        description: videoForm.description,
        order: (course.videos?.length || 0) + 1
      });

      alert('Tải lên và xử lý video thành công!');
      setVideoForm({ title: '', description: '', file: null });
      fetchCourseDetails(); // Reload course data
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Có lỗi xảy ra trong quá trình tải video lên.');
    } finally {
      setUploading(false);
      setProgressText('');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm('Bạn có chắc muốn xóa video này?')) {
      try {
        await videoAPI.delete(videoId);
        alert('Xóa video thành công');
        fetchCourseDetails();
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Không thể xóa video');
      }
    }
  };

  if (loading) return <Layout><div className="loading">Đang tải...</div></Layout>;
  if (!course) return <Layout><div className="loading">Khóa học không tồn tại</div></Layout>;

  return (
    <Layout>
      <div className="course-detail-page">
        <div className="course-header">
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>

        <div className="content-section">
          <div className="videos-list">
            <h2>🎬 Danh sách Video ({course.videos?.length || 0})</h2>
            
            {course.videos?.length === 0 ? (
              <p>Chưa có video nào. Hãy tải lên video đầu tiên!</p>
            ) : (
              course.videos?.map((video, index) => (
                <div key={video._id || index} className="video-item">
                  <div className="video-content-main">
                    <div className="video-info">
                      <h4>{video.title}</h4>
                      <p>{video.description}</p>
                    </div>
                    {video._id && (
                      <div className="video-player-container">
                        <video 
                          className="video-player"
                          controls 
                          src={videoAPI.getStreamUrl(video._id)}
                          preload="metadata"
                        >
                          Trình duyệt của bạn không hỗ trợ thẻ video.
                        </video>
                      </div>
                    )}
                  </div>
                  <div className="video-actions">
                    <button className="btn-delete" onClick={() => handleDeleteVideo(video._id)}>
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="upload-section">
            <h2>⬆️ Tải Video Lên</h2>
            <form className="upload-form" onSubmit={handleUploadVideo}>
              <div className="form-group">
                <label>Tên video *</label>
                <input
                  type="text"
                  name="title"
                  value={videoForm.title}
                  onChange={handleVideoFormChange}
                  required
                  placeholder="Ví dụ: Bài 1 - Giới thiệu"
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label>Mô tả video</label>
                <textarea
                  name="description"
                  value={videoForm.description}
                  onChange={handleVideoFormChange}
                  rows="3"
                  placeholder="Mô tả nội dung bài học..."
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label>File Video * (MP4, MKV, AVI...)</label>
                <input
                  type="file"
                  name="file"
                  accept="video/*"
                  onChange={handleVideoFormChange}
                  required
                  disabled={uploading}
                />
              </div>

              <button type="submit" className="btn-upload" disabled={uploading || !videoForm.file}>
                {uploading ? 'Đang tải lên...' : 'Bắt đầu tải lên'}
              </button>

              {uploading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="progress-text">{progressText} ({progress}%)</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default InstructorCourseDetail;
