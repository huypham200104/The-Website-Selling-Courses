const Video = require('../models/Video');
const Course = require('../models/Course');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const jwt = require('jsonwebtoken');

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

    // Process with ffmpeg: move moov atom to front for web streaming (faststart)
    const processedFileName = `web_${Date.now()}_${fileName}`;
    const processedPath = path.join(__dirname, '../uploads/videos', processedFileName);
    await new Promise((resolve, reject) => {
      ffmpeg(finalPath)
        .outputOptions(['-movflags +faststart', '-c copy'])
        .output(processedPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Delete raw merged file, keep only the processed one
    try { fs.unlinkSync(finalPath); } catch (_) {}

    // Get metadata from the processed file
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(processedPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const video = await Video.create({
      courseId,
      title,
      description,
      videoUrl: `/uploads/videos/${processedFileName}`,
      duration: metadata.format.duration,
      size: metadata.format.size,
      order: order || 0
    });

    await Course.findByIdAndUpdate(courseId, {
      $push: { videos: video._id }
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: video
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue a short-lived stream token for a video
// @route   GET /api/videos/:id/stream-token
// @access  Private (requires normal JWT auth)
exports.getStreamToken = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });

    const course = await Course.findById(video.courseId);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    const userId = req.user._id || req.user.id;
    const hasAccess = course.students.some(s => s.equals ? s.equals(userId) : String(s) === String(userId)) ||
                      course.instructor.equals(userId) ||
                      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied. Please enroll in the course first.' });
    }

    const streamToken = jwt.sign(
      { videoId: String(req.params.id), sub: String(userId), type: 'stream' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token: streamToken });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream video (protected)
// @route   GET /api/videos/:id/stream
// @access  Private
exports.streamVideo = async (req, res, next) => {
  try {
    console.log(`[STREAM] ${req.method} /api/videos/${req.params.id}/stream | Range: ${req.headers.range || 'NONE'} | user: ${req.user?._id}`);

    const video = await Video.findById(req.params.id);
    if (!video) {
      console.log('[STREAM] ❌ Video not found in DB:', req.params.id);
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    console.log('[STREAM] video.videoUrl:', video.videoUrl);

    const course = await Course.findById(video.courseId);
    if (!course) {
      console.log('[STREAM] ❌ Course not found:', video.courseId);
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const userId = req.user._id || req.user.id;
    const hasAccess = course.students.some(s => s.equals ? s.equals(userId) : String(s) === String(userId)) ||
                      course.instructor.equals(userId) ||
                      req.user.role === 'admin';
    console.log('[STREAM] hasAccess:', hasAccess, '| role:', req.user.role);

    if (!hasAccess) {
      console.log('[STREAM] ❌ Access denied for user:', userId);
      return res.status(403).json({ success: false, error: 'Access denied. Please enroll in the course first.' });
    }

    const videoPath = path.join(__dirname, '..', video.videoUrl);
    console.log('[STREAM] videoPath:', videoPath, '| exists:', fs.existsSync(videoPath));

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Video file not found'
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    console.log('[STREAM] fileSize:', fileSize, '| range:', range);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);

      if (start >= fileSize) {
        console.log('[STREAM] 416 start>=fileSize:', start, '>=', fileSize);
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
        return res.end();
      }

      const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
      const chunksize = (end - start) + 1;
      console.log(`[STREAM] ✅ 206 bytes ${start}-${end}/${fileSize} (${(chunksize/1024/1024).toFixed(2)} MB)`);
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
      console.log('[STREAM] ⚠️  No Range header — serving full file');
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('[STREAM] 💥 error:', error.message);
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
