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
              course.videos?.map((video, index) => {
                const streamUrl = video._id ? videoAPI.getStreamUrl(video._id) : '';
                console.log('Video item:', { 
                  id: video._id, 
                  title: video.title,
                  videoUrl: video.videoUrl,
                  streamUrl
                });
                
                return (
                  <div key={video._id || index} className="video-item">
                    <div className="video-content-main">
                      <div className="video-info">
                        <h4>{video.title}</h4>
                        <p>{video.description}</p>
                        {video._id && (
                          <p style={{ fontSize: '12px', color: '#666' }}>
                            Video ID: {video._id}
                          </p>
                        )}
                      </div>
                      {video._id ? (
                        <div className="video-player-container">
                          <video 
                            className="video-player"
                            controls 
                            src={streamUrl}
                            preload="metadata"
                            onError={(e) => {
                              console.error('Video error:', {
                                videoId: video._id,
                                error: e.target.error,
                                code: e.target.error?.code,
                                message: e.target.error?.message,
                                src: streamUrl
                              });
                            }}
                            onCanPlay={() => console.log('Video can play:', video._id)}
                            onLoadedMetadata={() => console.log('Video metadata loaded:', video._id)}
                          >
                            Trình duyệt của bạn không hỗ trợ thẻ video.
                          </video>
                          <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                            💡 Video đã được chuyển đổi sang fragmented MP4 (H.264/AAC)
                          </p>
                        </div>
                      ) : (
                        <div className="video-player-container">
                          <p style={{ color: 'red' }}>⚠️ Video không có ID</p>
                        </div>
                      )}
                    </div>
                    <div className="video-actions">
                      <button className="btn-delete" onClick={() => handleDeleteVideo(video._id)}>
                        🗑️ Xóa
                      </button>
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
        </div>
      </div>
    </Layout>
  );
}

export default InstructorCourseDetail;
