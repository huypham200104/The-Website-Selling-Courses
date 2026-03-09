const Video = require('../models/Video');
const Course = require('../models/Course');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const jwt = require('jsonwebtoken');

// ── fMP4 box helpers ──────────────────────────────────────────────────────────
const _u32 = (buf, off) => buf.readUInt32BE(off);
const _t4  = (buf, off) => buf.slice(off, off + 4).toString('ascii');

function _walkBoxes(buf, start, end, cb) {
  let pos = start;
  while (pos + 8 <= end) {
    const size = _u32(buf, pos);
    const type = _t4(buf, pos + 4);
    if (size < 8) break;
    cb(type, pos, size);
    pos += size;
  }
}

function _parseMovieMeta(moovBuf) {
  let videoTrackId = 1, videoTimescale = 30000;
  _walkBoxes(moovBuf, 8, moovBuf.length, (type, trakOff, trakSize) => {
    if (type !== 'trak') return;
    let isVideo = false, trackId = 0, timescale = 0;
    _walkBoxes(moovBuf, trakOff + 8, trakOff + trakSize, (t2, s2, sz2) => {
      if (t2 === 'tkhd') {
        const v = moovBuf[s2 + 8];
        trackId = v === 1 ? _u32(moovBuf, s2 + 28) : _u32(moovBuf, s2 + 20);
      }
      if (t2 === 'mdia') {
        _walkBoxes(moovBuf, s2 + 8, s2 + sz2, (t3, s3) => {
          if (t3 === 'hdlr' && _t4(moovBuf, s3 + 16) === 'vide') isVideo = true;
          if (t3 === 'mdhd') {
            const v = moovBuf[s3 + 8];
            timescale = v === 1 ? _u32(moovBuf, s3 + 28) : _u32(moovBuf, s3 + 20);
          }
        });
      }
    });
    if (isVideo && timescale > 0) { videoTrackId = trackId; videoTimescale = timescale; }
  });
  return { videoTrackId, videoTimescale };
}

function _parseMoofDecodeTime(moofBuf, videoTrackId) {
  let decodeTime = null;
  _walkBoxes(moofBuf, 8, moofBuf.length, (type, trafOff, trafSize) => {
    if (type !== 'traf' || decodeTime !== null) return;
    let trackId = 0, tfdt = null;
    _walkBoxes(moofBuf, trafOff + 8, trafOff + trafSize, (t2, s2) => {
      if (t2 === 'tfhd') trackId = _u32(moofBuf, s2 + 12);
      if (t2 === 'tfdt' && tfdt === null) {
        const v = moofBuf[s2 + 8];
        tfdt = v === 1 ? _u32(moofBuf, s2 + 12) * 4294967296 + _u32(moofBuf, s2 + 16)
                       : _u32(moofBuf, s2 + 12);
      }
    });
    if (trackId === videoTrackId && tfdt !== null) decodeTime = tfdt;
  });
  return decodeTime;
}

function _buildSeekTable(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const { size: fileSize } = fs.fstatSync(fd);
  const hdr = Buffer.alloc(8);
  let videoTrackId = 1, videoTimescale = 30000, fileOffset = 0;
  const table = [];
  while (fileOffset + 8 <= fileSize) {
    if (fs.readSync(fd, hdr, 0, 8, fileOffset) < 8) break;
    const boxSize = _u32(hdr, 0);
    const boxType = _t4(hdr, 4);
    if (boxSize < 8) break;
    if (boxType === 'moov') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      ({ videoTrackId, videoTimescale } = _parseMovieMeta(buf));
    } else if (boxType === 'moof') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      const dt = _parseMoofDecodeTime(buf, videoTrackId);
      if (dt !== null) table.push({ t: parseFloat((dt / videoTimescale).toFixed(6)), b: fileOffset });
    }
    fileOffset += boxSize;
  }
  fs.closeSync(fd);
  return table;
}

// ── In-memory seek-table cache (videoId → { seekTable, initEnd, size }) ──────
const videoCache = new Map();

function _getVideoMeta(videoId, filePath) {
  if (videoCache.has(videoId)) return videoCache.get(videoId);
  console.log(`[CACHE] Building seek table for ${videoId} …`);
  const seekTable = _buildSeekTable(filePath);
  const size = fs.statSync(filePath).size;
  // initEnd = byte before the first moof (ftyp+moov only)
  const initEnd = seekTable.length > 0 ? seekTable[0].b - 1 : size - 1;
  const meta = { seekTable, initEnd, size };
  videoCache.set(videoId, meta);
  console.log(`[CACHE] Cached ${seekTable.length} fragments for ${videoId}`);
  return meta;
}

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

    // Process with ffmpeg: produce fragmented MP4 (required for MSE byte-range streaming)
    const processedFileName = `web_${Date.now()}_${fileName}`;
    const processedPath = path.join(__dirname, '../uploads/videos', processedFileName);
    
    await new Promise((resolve, reject) => {
      ffmpeg(finalPath)
        .outputOptions(['-movflags frag_keyframe+empty_moov+default_base_moof', '-c copy'])
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
        if (err) {
          console.warn('FFprobe error or missing ffmpeg. Falling back to default values for dummy files:', err.message);
          resolve({ format: { duration: 0, size: 0 } });
        } else {
          resolve(data);
        }
      });
    });

    const duration = metadata.format.duration || 0;
    
    // Fallback: Calculate size using fs if ffprobe fails or fallback was used
    let size = metadata.format.size || 0;
    if (size === 0) {
      try {
        const stats = fs.statSync(processedPath);
        size = stats.size;
      } catch (e) {
        console.error('Error getting file stats:', e);
      }
    }

    const video = await Video.create({
      courseId,
      title,
      description,
      videoUrl: `/uploads/videos/${processedFileName}`,
      duration,
      size,
      order: order || 0
      // seekTable is no longer stored in DB — built from file on first stream request
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

// @desc    Stream video (protected) — seek-table built from file, cached in memory
// @route   GET /api/videos/:id/stream
// @access  Private
exports.streamVideo = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    console.log(`[STREAM] ${req.method} /api/videos/${videoId}/stream | Range: ${req.headers.range || 'NONE'} | user: ${req.user?._id}`);

    const video = await Video.findById(videoId, 'videoUrl courseId');
    if (!video) {
      console.log('[STREAM] ❌ Video not found in DB:', videoId);
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const course = await Course.findById(video.courseId, 'students instructor');
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const userId = req.user._id || req.user.id;
    const hasAccess = course.students.some(s => s.equals ? s.equals(userId) : String(s) === String(userId)) ||
                      course.instructor.equals(userId) ||
                      req.user.role === 'admin';
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied. Please enroll in the course first.' });
    }

    const videoPath = path.join(__dirname, '..', video.videoUrl);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ success: false, error: 'Video file not found' });
    }

    // Build seek table from file on first access, then serve from cache
    const { seekTable, initEnd, size: fileSize } = _getVideoMeta(videoId, videoPath);

    // Return seek table metadata when client requests it (no Range header + ?meta=1)
    if (req.query.meta === '1') {
      return res.json({ success: true, data: { seekTable, initEnd, fileSize } });
    }

    const range = req.headers.range;
    console.log(`[STREAM] fileSize=${fileSize} | range=${range || 'none'} | fragments=${seekTable.length}`);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);

      if (start >= fileSize) {
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

    // Delete video file and evict from cache
    const videoPath = path.join(__dirname, '..', video.videoUrl);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    videoCache.delete(String(video._id));

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
