import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './InstructorCourseDetail.css';

// 🚀 UPLOAD CONFIGURATION - Adjust these for your network!
const UPLOAD_CONFIG = {
  // Fast local network (LAN/Localhost): Use small chunks, high concurrency
  // Slow internet: Use larger chunks, low concurrency
  chunkSizeKB: 5 * 1024,           // 5MB (small chunks = faster on fast networks)
  maxConcurrent: 5,                 // 5 simultaneous uploads (max speed on fast networks)
  
  // Alternative configs:
  // Slow network: chunkSizeKB: 10 * 1024, maxConcurrent: 2
  // Medium network: chunkSizeKB: 5 * 1024, maxConcurrent: 3
  // Fast network: chunkSizeKB: 5 * 1024, maxConcurrent: 5
};

// Simple chunk size (no dynamic sizing for predictable performance)
const CHUNK_SIZE = UPLOAD_CONFIG.chunkSizeKB * 1024;
const MAX_CONCURRENT_UPLOADS = UPLOAD_CONFIG.maxConcurrent;

function InstructorCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewMeta, setReviewMeta] = useState({ averageRating: 0, reviewCount: 0 });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'uploading', 'processing', 'done'
  const [uploadStats, setUploadStats] = useState({
    uploadedMB: 0,
    totalMB: 0,
    speed: 0,
    eta: 0,
    startTime: null
  });
  const [abortController, setAbortController] = useState(null);
  
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    file: null
  });

  const [essayForm, setEssayForm] = useState({
    title: '',
    description: '',
    prompt: ''
  });

  useEffect(() => {
    fetchCourseDetails();
    loadReviews();
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

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await courseService.getReviews(id);
      setReviews(response.data || []);
      setReviewMeta(response.meta || { averageRating: 0, reviewCount: 0 });
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
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

  const handleStopUpload = () => {
    if (abortController) {
      abortController.abort();
      setUploading(false);
      setProgress(0);
      setProgressText('');
      setUploadPhase('idle');
      setUploadStats({ uploadedMB: 0, totalMB: 0, speed: 0, eta: 0, startTime: null });
      setAbortController(null);
      alert('⚠️ Đã dừng upload. Các chunk đã tải lên sẽ được tự động xóa.');
    }
  };
  
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatReviewDate = (value) => {
    if (!value) return 'Không rõ thời gian';
    try {
      return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Invalid review date:', value, error);
      return 'Không rõ thời gian';
    }
  };

  const renderStars = (value = 0) => (
    <div className="instructor-review-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={value >= star ? 'filled' : 'empty'}>★</span>
      ))}
    </div>
  );

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.file || !videoForm.title) {
      return alert('Vui lòng nhập tên video và chọn file');
    }

    const file = videoForm.file;
    const chunkSize = UPLOAD_CONFIG.chunkSizeKB * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    setUploading(true);
    setProgress(0);
    setUploadPhase('uploading');
    
    const fileSizeMB = (file.size / (1024 * 1024));
    const totalMB = parseFloat(fileSizeMB.toFixed(1));
    const chunkSizeMB = (chunkSize / (1024 * 1024)).toFixed(0);
    
    setUploadStats({
      uploadedMB: 0,
      totalMB: totalMB,
      speed: 0,
      eta: 0,
      startTime: Date.now()
    });
    
    setProgressText(`📦 Bắt đầu upload ${totalMB}MB (${totalChunks} chunks × ${chunkSizeMB}MB, ${MAX_CONCURRENT_UPLOADS}x parallel)`);

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadedChunks = [];
    
    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const uploadStartTime = Date.now();
      let completedChunks = 0;
      
      // 🚀 TRUE PARALLEL UPLOAD - Start all uploads with concurrency control
      const uploadQueue = [];
      const activeUploads = new Set();
      
      // Create all upload tasks
      for (let i = 0; i < totalChunks; i++) {
        uploadQueue.push(i);
      }
      
      const uploadChunk = async (chunkIndex) => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('fileName', fileName);

        const response = await videoAPI.uploadChunk(formData, controller.signal);
        uploadedChunks[chunkIndex] = response.data.chunkPath;
        
        // Update progress
        completedChunks++;
        const percentCompleted = Math.round((completedChunks / totalChunks) * 100);
        setProgress(percentCompleted);
        
        // Calculate speed and ETA with better accuracy
        const elapsed = (Date.now() - uploadStartTime) / 1000; // seconds
        const uploadedBytes = completedChunks * chunkSize;
        const uploadedMB = uploadedBytes / (1024 * 1024);
        const speedMBps = uploadedMB / elapsed;
        const remainingBytes = (totalChunks - completedChunks) * chunkSize;
        const remainingMB = remainingBytes / (1024 * 1024);
        const etaSeconds = speedMBps > 0 ? remainingMB / speedMBps : 0;
        
        // Update stats
        setUploadStats({
          uploadedMB: parseFloat(uploadedMB.toFixed(1)),
          totalMB: totalMB,
          speed: parseFloat(speedMBps.toFixed(1)),
          eta: Math.round(etaSeconds),
          startTime: uploadStartTime
        });
        
        const remainingChunks = totalChunks - completedChunks;
        setProgressText(
          `⚡ Đang upload: ${completedChunks}/${totalChunks} chunks ` +
          `(${uploadedMB.toFixed(1)}/${totalMB}MB) | ` +
          `${speedMBps.toFixed(1)} MB/s | ` +
          (remainingChunks > 0 ? `còn ${formatTime(etaSeconds)}` : 'Hoàn tất!')
        );
      };
      
      // Process uploads with concurrency limit
      const processQueue = async () => {
        while (uploadQueue.length > 0 || activeUploads.size > 0) {
          // Start new uploads up to concurrency limit
          while (uploadQueue.length > 0 && activeUploads.size < MAX_CONCURRENT_UPLOADS) {
            const chunkIndex = uploadQueue.shift();
            const uploadPromise = uploadChunk(chunkIndex)
              .then(() => activeUploads.delete(uploadPromise))
              .catch(err => {
                activeUploads.delete(uploadPromise);
                throw err;
              });
            activeUploads.add(uploadPromise);
          }
          
          // Wait for at least one upload to complete
          if (activeUploads.size > 0) {
            await Promise.race(activeUploads);
          }
        }
      };
      
      await processQueue();

      // Upload phase completed
      const uploadTime = ((Date.now() - uploadStartTime) / 1000);
      setProgressText(`✅ Upload hoàn tất trong ${formatTime(uploadTime)}! Đang xử lý video với FFmpeg...`);
      setProgress(100);
      setUploadPhase('processing');
      
      // Start processing phase
      const processingStartTime = Date.now();
      
      await videoAPI.mergeChunks({
        fileName,
        chunks: uploadedChunks,
        courseId: course._id,
        title: videoForm.title,
        description: videoForm.description,
        order: (course.videos?.length || 0) + 1
      }, controller.signal);

      // Processing completed
      const processingTime = ((Date.now() - processingStartTime) / 1000);
      const totalTime = ((Date.now() - uploadStartTime) / 1000);
      
      setUploadPhase('done');
      setProgressText(`🎉 Hoàn tất! Upload: ${formatTime(uploadTime)} | FFmpeg: ${formatTime(processingTime)} | Tổng: ${formatTime(totalTime)}`);
      
      alert(
        `✅ Tải lên thành công!\n\n` +
        `📊 Thống kê:\n` +
        `• Upload: ${formatTime(uploadTime)}\n` +
        `• Processing: ${formatTime(processingTime)}\n` +
        `• Tổng thời gian: ${formatTime(totalTime)}\n\n` +
        `📹 Video đã được chuyển đổi sang fragmented MP4 (H.264/AAC)`
      );
      
      setVideoForm({ title: '', description: '', file: null });
      fetchCourseDetails(); // Reload course data
    } catch (error) {
      console.error('Error uploading video:', error);
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        // Upload was cancelled by user
        console.log('Upload cancelled by user');
      } else {
        alert('Có lỗi xảy ra trong quá trình tải video lên.');
      }
    } finally {
      setUploading(false);
      if (uploadPhase !== 'done') {
        setProgressText('');
        setUploadPhase('idle');
      }
      setAbortController(null);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!videoId) {
      alert('Video ID không hợp lệ');
      return;
    }

    if (window.confirm('⚠️ Bạn có chắc muốn xóa video này?\n\nVideo sẽ bị xóa vĩnh viễn khỏi hệ thống (bao gồm cả file video).')) {
      try {
        const response = await videoAPI.delete(videoId);
        console.log('Delete video response:', response);
        alert('✅ Đã xóa video thành công (file và database)');
        fetchCourseDetails();
      } catch (error) {
        console.error('Error deleting video:', error);
        const errorMsg = error.response?.data?.error || 'Không thể xóa video';
        alert(`❌ Lỗi: ${errorMsg}`);
      }
    }
  };

  const handleUploadQuizJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const quizData = JSON.parse(text);

      if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
        alert('File JSON không đúng định dạng. Cần có title và mảng questions.');
        return;
      }

      await courseService.addQuiz(id, quizData);
      alert('Đã thêm bài tập trắc nghiệm!');
      fetchCourseDetails(); // Reload course data
    } catch (err) {
      alert('Lỗi: Vui lòng đảm bảo file JSON phải hợp lệ.');
      console.error(err);
    }
    e.target.value = null; // reset
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      try {
        await courseService.deleteQuiz(id, quizId);
        fetchCourseDetails();
      } catch (err) {
        console.error('Lỗi khi xóa bài tập:', err);
        alert('Có lỗi xảy ra khi xóa bài tập.');
      }
    }
  };

  const handleEssayChange = (e) => {
    const { name, value } = e.target;
    setEssayForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEssay = async (e) => {
    e.preventDefault();
    if (!essayForm.title || !essayForm.prompt) {
      alert('Vui lòng nhập tiêu đề và đề bài tự luận');
      return;
    }
    try {
      const payload = {
        title: essayForm.title,
        description: essayForm.description,
        type: 'essay',
        questions: [
          {
            question: essayForm.prompt,
            options: [],
            correctAnswer: 0,
            type: 'essay'
          }
        ]
      };
      await courseService.addQuiz(id, payload);
      alert('Đã thêm bài tập tự luận');
      setEssayForm({ title: '', description: '', prompt: '' });
      fetchCourseDetails();
    } catch (err) {
      console.error('Lỗi tạo bài tự luận:', err);
      alert(err.response?.data?.message || 'Không thể tạo bài tự luận');
    }
  };

  if (loading) return <Layout><div className="loading">Đang tải...</div></Layout>;
  if (!course) return <Layout><div className="loading">Khóa học không tồn tại</div></Layout>;

  const getTimestamp = (item) => {
    if (item?.createdAt) return new Date(item.createdAt).getTime();
    if (item?._id) {
      // Extract timestamp from Mongo ObjectId
      return parseInt(item._id.substring(0, 8), 16) * 1000;
    }
    return 0;
  };

  const lessons = [
    ...(course.videos || []).map((v) => ({ ...v, type: 'video' })),
    ...(course.quizzes || []).map((q) => ({ ...q, type: q.type || (q.questions?.some(qq => !qq.options || qq.options.length === 0) ? 'essay' : 'quiz') }))
  ].sort((a, b) => getTimestamp(a) - getTimestamp(b));

  return (
    <Layout>
      <div className="course-detail-page">
        <div className="course-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => navigate(`/instructor/courses/${course._id}/quiz-stats`)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📊 Thống kê & chấm bài
            </button>
            <button 
              onClick={() => navigate(`/instructor/courses/${course._id}`)}
              style={{
                padding: '10px 16px',
                backgroundColor: '#e2e8f0',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🔄 Làm mới
            </button>
          </div>
        </div>

        <div className="content-section">
          <div className="lessons-list">
            <h2>📚 Nội dung khóa học (video + bài tập)</h2>
            {lessons.length === 0 ? (
              <p>Chưa có nội dung. Hãy tải video hoặc thêm bài tập.</p>
            ) : (
              lessons.map((item, idx) => {
                const isVideo = item.type === 'video';
                const isEssay = item.type === 'essay' || (item.questions && item.questions[0] && (!item.questions[0].options || item.questions[0].options.length === 0 || item.questions[0].type === 'essay'));
                const label = isVideo ? 'Video' : (isEssay ? 'Bài tập tự luận' : 'Bài tập trắc nghiệm');
                const streamUrl = isVideo && item._id ? videoAPI.getStreamUrl(item._id) : '';
                return (
                  <div key={item._id || idx} className="lesson-item" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '999px', background: isVideo ? '#e0f2fe' : isEssay ? '#fef9c3' : '#e0f7f1', color: '#0f172a', fontWeight: 600 }}>
                            {label}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>#{idx + 1}</span>
                        </div>
                        <h4 style={{ margin: '0 0 6px 0' }}>{item.title}</h4>
                        <p style={{ margin: '0 0 8px 0', color: '#475569' }}>{item.description || (isVideo ? 'Video bài học' : (isEssay ? item.questions?.[0]?.question : item.questions?.[0]?.question))}</p>
                        {!isVideo && (
                          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            {isEssay ? 'Tự luận - học viên nộp đáp án dạng văn bản' : `${item.questions?.length || 0} câu hỏi`}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        {isVideo && item._id && (
                          <video 
                            style={{ width: '260px', borderRadius: '8px', background: '#000' }}
                            controls 
                            src={streamUrl}
                            preload="metadata"
                          />
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isVideo ? (
                            <button className="btn-delete" onClick={() => handleDeleteVideo(item._id)}>🗑️ Xóa</button>
                          ) : (
                            <button className="btn-delete" onClick={() => handleDeleteQuiz(item._id)}>🗑️ Xóa</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
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
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  💡 Mọi video sẽ được tự động chuyển đổi sang fragmented MP4 (H.264/AAC) cho streaming tối ưu.
                </p>
              </div>

              <div className="upload-buttons">
                <button type="submit" className="btn-upload" disabled={uploading || !videoForm.file}>
                  {uploading ? 'Đang tải lên...' : 'Bắt đầu tải lên'}
                </button>
                
                {uploading && (
                  <button 
                    type="button" 
                    className="btn-stop-upload" 
                    onClick={handleStopUpload}
                  >
                    🛑 Dừng Upload
                  </button>
                )}
              </div>

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

          <div className="quizzes-section" style={{ marginTop: '30px' }}>
            <h2>📝 Thêm bài tập</h2>

            <div className="upload-quiz-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>⬆️ Tải lên file JSON Trắc nghiệm</h3>
              <div className="form-group">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleUploadQuizJSON}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  💡 Format file JSON trắc nghiệm mẫu:<br/>
                  <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
{`{
  "title": "Tên bài tập",
  "description": "Mô tả bài tập",
  "questions": [
    {
      "question": "Câu hỏi 1",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0
    }
  ]
}`}
                  </pre>
                </p>
              </div>
            </div>

            <div className="upload-quiz-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 15px 0' }}>🧾 Thêm bài tập tự luận</h3>
              <form onSubmit={handleCreateEssay}>
                <div className="form-group">
                  <label>Tiêu đề *</label>
                  <input name="title" value={essayForm.title} onChange={handleEssayChange} required />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea name="description" value={essayForm.description} onChange={handleEssayChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Đề bài / Yêu cầu *</label>
                  <textarea name="prompt" value={essayForm.prompt} onChange={handleEssayChange} rows="4" required placeholder="Viết bài luận về..." />
                </div>
                <button type="submit" className="btn-primary">Thêm bài tự luận</button>
              </form>
            </div>
          </div>

          <div className="reviews-section">
            <div className="reviews-section-header">
              <div>
                <h2>⭐️ Đánh giá từ học viên</h2>
                <p className="reviews-section-subtitle">
                  Theo dõi mức độ hài lòng thực tế của học viên để cải thiện khóa học.
                </p>
              </div>
              <button
                type="button"
                className="reviews-refresh-btn"
                onClick={loadReviews}
                disabled={reviewsLoading}
              >
                {reviewsLoading ? 'Đang tải...' : '🔄 Làm mới'}
              </button>
            </div>

            <div className="reviews-metrics">
              <div className="reviews-average-card">
                <span className="reviews-average-value">{(reviewMeta?.averageRating || 0).toFixed(1)}</span>
                <span className="reviews-average-label">Điểm trung bình</span>
                {renderStars(Math.round(reviewMeta?.averageRating || 0))}
              </div>
              <div className="reviews-meta-info">
                <p><strong>{reviewMeta?.reviewCount || 0}</strong> lượt đánh giá</p>
                <p>{reviewsLoading ? 'Đang đồng bộ dữ liệu...' : 'Cập nhật theo thời gian thực'}</p>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="reviews-loading">Đang tải danh sách đánh giá...</div>
            ) : reviews?.length === 0 ? (
              <div className="reviews-empty">Chưa có đánh giá nào cho khóa học này.</div>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div>
                        <p className="review-author">{review.student?.name || 'Học viên ẩn danh'}</p>
                        <p className="review-email">{review.student?.email || 'Không có email'}</p>
                      </div>
                      <div className="review-rating">
                        <span className="review-rating-value">{review.rating?.toFixed(1)}</span>
                        {renderStars(Math.round(review.rating || 0))}
                      </div>
                    </div>
                    <p className="review-comment">{review.comment || 'Người học không để lại nhận xét.'}</p>
                    <div className="review-card-footer">
                      <span>{formatReviewDate(review.createdAt)}</span>
                      <span>Mã đánh giá #{review._id?.slice(-6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default InstructorCourseDetail;
