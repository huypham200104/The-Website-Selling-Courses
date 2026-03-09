const Video = require('../models/Video');
const Course = require('../models/Course');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// @desc    Upload video chunk
// @route   POST /api/videos/upload-chunk
// @access  Private
exports.uploadChunk = async (req, res, next) => {
  try {
    const { chunkIndex, totalChunks, fileName } = req.body;
    const chunk = req.file;
    
    if (!chunk) {
      return res.status(400).json({
        success: false,
        error: 'No chunk uploaded'
      });
    }

    res.json({
      success: true,
      message: 'Chunk uploaded successfully',
      chunkIndex: parseInt(chunkIndex),
      chunkPath: chunk.filename
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Merge chunks and create video
// @route   POST /api/videos/merge-chunks
// @access  Private
exports.mergeChunks = async (req, res, next) => {
  try {
    const { fileName, chunks, courseId, title, description, order } = req.body;
    
    if (!chunks || chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No chunks to merge'
      });
    }

    // Check if user has access to this course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to upload videos to this course'
      });
    }

    const finalPath = path.join(__dirname, '../uploads/videos', fileName);
    const writeStream = fs.createWriteStream(finalPath);
    
    // Merge chunks
    for (let chunk of chunks) {
      const chunkPath = path.join(__dirname, '../uploads/chunks', chunk);
      if (fs.existsSync(chunkPath)) {
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
        fs.unlinkSync(chunkPath); // Delete chunk after merge
      }
    }
    
    writeStream.end();
    
    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Get video metadata using ffmpeg
    ffmpeg.ffprobe(finalPath, async (err, metadata) => {
      let duration = 0;
      let size = 0;

      if (err) {
        console.warn('FFprobe error or missing ffmpeg. Falling back to default values for dummy files:', err.message);
        // Fallback: Calculate size using fs for dummy files
        try {
          const stats = fs.statSync(finalPath);
          size = stats.size;
        } catch (e) {
          console.error('Error getting file stats:', e);
        }
      } else {
        duration = metadata.format.duration || 0;
        size = metadata.format.size || 0;
      }
      
      // Create video record
      const video = await Video.create({
        courseId,
        title,
        description,
        videoUrl: `/uploads/videos/${fileName}`,
        duration,
        size,
        order: order || 0
      });
      
      // Add video to course
      await Course.findByIdAndUpdate(courseId, {
        $push: { videos: video._id }
      });
      
      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: video
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream video (protected)
// @route   GET /api/videos/:id/stream
// @access  Private
exports.streamVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: 'Video not found' 
      });
    }
    
    // Check if user has access to this video
    const course = await Course.findById(video.courseId);
    const hasAccess = course.students.includes(req.user._id) || 
                      course.instructor.equals(req.user._id) ||
                      req.user.role === 'admin';
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Please enroll in the course first.' 
      });
    }
    
    const videoPath = path.join(__dirname, '..', video.videoUrl);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Video file not found'
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Partial content (streaming)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Full video
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get video details
// @route   GET /api/videos/:id
// @access  Private
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check authorization
    const course = await Course.findById(video.courseId);
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this video'
      });
    }

    // Delete video file
    const videoPath = path.join(__dirname, '..', video.videoUrl);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Remove from course
    await Course.findByIdAndUpdate(video.courseId, {
      $pull: { videos: video._id }
    });

    // Delete video record
    await video.deleteOne();

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
