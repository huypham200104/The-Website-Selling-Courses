const Video = require('../models/Video');
const Course = require('../models/Course');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const jwt = require('jsonwebtoken');// ── fMP4 box helpers ──────────────────────────────────────────────────────────
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
  let videoCodec = null, audioCodec = null, hasAudio = false;
  _walkBoxes(moovBuf, 8, moovBuf.length, (type, trakOff, trakSize) => {
    if (type !== 'trak') return;
    let isVideo = false, isAudio = false, trackId = 0, timescale = 0, trackCodec = null;
    _walkBoxes(moovBuf, trakOff + 8, trakOff + trakSize, (t2, s2, sz2) => {
      if (t2 === 'tkhd') {
        const v = moovBuf[s2 + 8];
        trackId = v === 1 ? _u32(moovBuf, s2 + 28) : _u32(moovBuf, s2 + 20);
      }
      if (t2 === 'mdia') {
        _walkBoxes(moovBuf, s2 + 8, s2 + sz2, (t3, s3, sz3) => {
          if (t3 === 'hdlr') {
            const handler = _t4(moovBuf, s3 + 16);
            if (handler === 'vide') isVideo = true;
            if (handler === 'soun') isAudio = true;
          }
          if (t3 === 'mdhd') {
            const v = moovBuf[s3 + 8];
            timescale = v === 1 ? _u32(moovBuf, s3 + 28) : _u32(moovBuf, s3 + 20);
          }
          if (t3 === 'minf') {
            _walkBoxes(moovBuf, s3 + 8, s3 + sz3, (t4, s4, sz4) => {
              if (t4 === 'stbl') {
                _walkBoxes(moovBuf, s4 + 8, s4 + sz4, (t5, s5) => {
                  if (t5 === 'stsd') {
                    // stsd FullBox header = 16 bytes; first entry fourcc at +20
                    trackCodec = _t4(moovBuf, s5 + 20).trim().toLowerCase();
                  }
                });
              }
            });
          }
        });
      }
    });
    if (isVideo && timescale > 0) { videoTrackId = trackId; videoTimescale = timescale; if (trackCodec) videoCodec = trackCodec; }
    if (isAudio) { hasAudio = true; if (trackCodec) audioCodec = trackCodec; }
  });
  return { videoTrackId, videoTimescale, videoCodec, audioCodec, hasAudio };
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

function _buildFileMeta(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const { size: fileSize } = fs.fstatSync(fd);
  const hdr = Buffer.alloc(8);
  let videoTrackId = 1, videoTimescale = 30000, fileOffset = 0;
  let videoCodec = null, audioCodec = null, hasAudio = false;
  const table = [];
  while (fileOffset + 8 <= fileSize) {
    if (fs.readSync(fd, hdr, 0, 8, fileOffset) < 8) break;
    const boxSize = _u32(hdr, 0);
    const boxType = _t4(hdr, 4);
    if (boxSize < 8) break;
    if (boxType === 'moov') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      ({ videoTrackId, videoTimescale, videoCodec, audioCodec, hasAudio } = _parseMovieMeta(buf));
    } else if (boxType === 'moof') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      const dt = _parseMoofDecodeTime(buf, videoTrackId);
      if (dt !== null) table.push({ t: parseFloat((dt / videoTimescale).toFixed(6)), b: fileOffset });
    }
    fileOffset += boxSize;
  }
  fs.closeSync(fd);
  return { seekTable: table, videoCodec, audioCodec, hasAudio };
}

// ── In-memory seek-table cache (videoId → { seekTable, initEnd, size }) ──────
const videoCache = new Map();

function _getVideoMeta(videoId, filePath) {
  if (videoCache.has(videoId)) return videoCache.get(videoId);
  console.log(`[CACHE] Building seek table for ${videoId} …`);
  const { seekTable, videoCodec, audioCodec, hasAudio } = _buildFileMeta(filePath);
  const size = fs.statSync(filePath).size;
  // initEnd = byte before the first moof (ftyp+moov only)
  const initEnd = seekTable.length > 0 ? seekTable[0].b - 1 : size - 1;
  const meta = { seekTable, initEnd, size, videoCodec, audioCodec, hasAudio };
  videoCache.set(videoId, meta);
  console.log(`[CACHE] Cached ${seekTable.length} fragments for ${videoId} codec=${videoCodec}+${audioCodec}`);
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
exports.mergeChunks = async (req, res, next) => {  let ffmpegCommand = null; // Store FFmpeg command for potential cleanup
  let finalPath = null;
  let processedPath = null;
  let aborted = false;

  // Detect client disconnect/abort
  req.on('close', () => {
    if (!res.headersSent) {
      console.log('[MERGE] ⚠️ Client disconnected, aborting FFmpeg process...');
      aborted = true;
      
      // Kill FFmpeg process if running
      if (ffmpegCommand) {
        try {
          ffmpegCommand.kill('SIGKILL');
          console.log('[MERGE] ✅ FFmpeg process killed');
        } catch (err) {
          console.error('[MERGE] ❌ Error killing FFmpeg:', err.message);
        }
      }
      
      // Cleanup temp files
      setTimeout(() => {
        if (finalPath) {
          try { fs.unlinkSync(finalPath); } catch (_) {}
        }
        if (processedPath) {
          try { fs.unlinkSync(processedPath); } catch (_) {}
        }
        console.log('[MERGE] 🧹 Cleaned up temporary files');
      }, 100);
    }
  });
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

    finalPath = path.join(__dirname, '../uploads/videos', fileName);
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

    // Process with ffmpeg: convert ALL videos to fragmented MP4 with H.264/AAC
    const processedFileName = `web_${Date.now()}_${fileName}`;
    processedPath = path.join(__dirname, '../uploads/videos', processedFileName);
    
    // Check if client already aborted
    if (aborted) {
      console.log('[MERGE] ⚠️ Upload aborted before FFmpeg started, cleaning up...');
      try { fs.unlinkSync(finalPath); } catch (_) {}
      return; // Don't send response, client already disconnected
    }
    
    console.log(`[MERGE] Processing video with FFmpeg...`);
    console.log(`[MERGE] Input file: ${fileName}`);

    console.log('[FFMPEG] ⚡ Stream copy mode (no re-encode)');
    const outputOptions = [
      '-c copy',
      '-movflags frag_keyframe+empty_moov+default_base_moof',
    ];
    
    await new Promise((resolve, reject) => {
      // Check if already aborted before starting FFmpeg
      if (aborted) {
        console.log('[FFMPEG] ⚠️ Skipping FFmpeg - client aborted');
        return reject(new Error('Client aborted'));
      }

      ffmpegCommand = ffmpeg(finalPath)
        .setFfmpegPath(ffmpegPath)
        .outputOptions(outputOptions)
        .output(processedPath)
        .on('start', (cmd) => {
          console.log('[FFMPEG] Command:', cmd);
          console.log('[FFMPEG] 💡 To stop: Client can abort request');
        })
        .on('progress', (progress) => {
          // Check abort flag during processing
          if (aborted) {
            console.log('[FFMPEG] ⚠️ Aborting FFmpeg due to client disconnect...');
            ffmpegCommand.kill('SIGKILL');
            return;
          }
          
          if (progress.percent) {
            console.log(`[FFMPEG] Processing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          if (aborted) {
            console.log('[FFMPEG] ⚠️ FFmpeg finished but client aborted, cleaning up...');
            try { fs.unlinkSync(processedPath); } catch (_) {}
            return reject(new Error('Client aborted'));
          }
          console.log('[FFMPEG] ✅ Video converted to fragmented MP4 successfully');
          resolve();
        })
        .on('error', (err) => {
          if (aborted || err.message.includes('SIGKILL')) {
            console.log('[FFMPEG] ⚠️ FFmpeg killed due to client abort');
            return reject(new Error('Client aborted'));
          }
          console.error('[FFMPEG] ❌ Error:', err.message);
          reject(err);
        })
        .run();
    });

    // Delete raw merged file, keep only the processed one
    try { fs.unlinkSync(finalPath); } catch (_) {}

    // Get metadata from the processed file
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg(processedPath)
        .setFfprobePath(ffprobePath)
        .ffprobe((err, data) => {
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
      videoUrl: `uploads/videos/${processedFileName}`,
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
    // Check if error is due to client abort
    if (error.message === 'Client aborted' || aborted) {
      console.log('[MERGE] ⚠️ Upload aborted by client, cleaned up successfully');
      // Don't send response if client already disconnected
      if (!res.headersSent) {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled by client'
        });
      }
      return;
    }
    
    // Cleanup on other errors
    if (finalPath) {
      try { fs.unlinkSync(finalPath); } catch (_) {}
    }
    if (processedPath) {
      try { fs.unlinkSync(processedPath); } catch (_) {}
    }
    
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

    // Remove leading slash if present to ensure path.join works correctly
    const cleanVideoUrl = video.videoUrl.startsWith('/') ? video.videoUrl.slice(1) : video.videoUrl;
    const videoPath = path.join(__dirname, '..', cleanVideoUrl);
    if (!fs.existsSync(videoPath)) {
      console.log('[STREAM] ❌ Video file not found:', videoPath);
      return res.status(404).json({ success: false, error: 'Video file not found' });
    }

    // Build seek table from file on first access, then serve from cache
    const { seekTable, initEnd, size: fileSize, videoCodec, audioCodec, hasAudio } = _getVideoMeta(videoId, videoPath);

    // Return seek table metadata when client requests it (no Range header + ?meta=1)
    if (req.query.meta === '1') {
      return res.json({ success: true, data: { seekTable, initEnd, fileSize, videoCodec, audioCodec, hasAudio } });
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

    // Check if file exists
    const cleanVideoUrl = video.videoUrl.startsWith('/') ? video.videoUrl.slice(1) : video.videoUrl;
    const videoPath = path.join(__dirname, '..', cleanVideoUrl);
    const fileExists = fs.existsSync(videoPath);
    
    console.log('[GET VIDEO] Video details:', {
      id: video._id,
      videoUrl: video.videoUrl,
      cleanVideoUrl,
      videoPath,
      fileExists
    });

    let fileMeta = {};
    if (fileExists) {
      const { seekTable, initEnd, size: fileSize, videoCodec, audioCodec, hasAudio } = _getVideoMeta(String(video._id), videoPath);
      fileMeta = { seekTable, initEnd, fileSize, videoCodec, audioCodec, hasAudio };
    }

    res.json({
      success: true,
      data: {
        ...video.toObject(),
        ...fileMeta,
        debug: {
          videoPath,
          fileExists,
          cleanVideoUrl
        }
      }
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
    console.log(`[DELETE] Attempting to delete video: ${req.params.id} by user: ${req.user._id}`);
    
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      console.log(`[DELETE] ❌ Video not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check authorization
    const course = await Course.findById(video.courseId);
    if (!course) {
      console.log(`[DELETE] ❌ Course not found: ${video.courseId}`);
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log(`[DELETE] ❌ Unauthorized: User ${req.user._id} not instructor of course ${course._id}`);
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this video'
      });
    }

    // Delete video file and evict from cache
    const cleanVideoUrl = video.videoUrl.startsWith('/') ? video.videoUrl.slice(1) : video.videoUrl;
    const videoPath = path.join(__dirname, '..', cleanVideoUrl);
    
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      console.log(`[DELETE] ✅ Deleted video file: ${videoPath}`);
    } else {
      console.log(`[DELETE] ⚠️ Video file not found on disk: ${videoPath}`);
    }
    
    videoCache.delete(String(video._id));
    console.log(`[DELETE] ✅ Evicted from cache: ${video._id}`);

    // Remove from course
    await Course.findByIdAndUpdate(video.courseId, {
      $pull: { videos: video._id }
    });
    console.log(`[DELETE] ✅ Removed video reference from course: ${video.courseId}`);

    // Delete video record from database
    await video.deleteOne();
    console.log(`[DELETE] ✅ Deleted video record from database: ${video._id}`);

    res.json({
      success: true,
      message: 'Video deleted successfully',
      data: {
        videoId: video._id,
        title: video.title
      }
    });
  } catch (error) {
    console.error(`[DELETE] 💥 Error deleting video:`, error);
    next(error);
  }
};
