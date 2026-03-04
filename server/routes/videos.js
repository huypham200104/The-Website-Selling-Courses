const express = require('express');
const router = express.Router();
const {
  uploadChunk,
  mergeChunks,
  streamVideo,
  getVideo,
  deleteVideo
} = require('../controllers/videoController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const roleCheck = require('../middleware/roleCheck');

// Upload chunk
router.post('/upload-chunk', auth, roleCheck('instructor', 'admin'), upload.single('chunk'), uploadChunk);

// Merge chunks
router.post('/merge-chunks', auth, roleCheck('instructor', 'admin'), mergeChunks);

// Stream video
router.get('/:id/stream', auth, streamVideo);

// Get video details
router.get('/:id', auth, getVideo);

// Delete video
router.delete('/:id', auth, roleCheck('instructor', 'admin'), deleteVideo);

module.exports = router;
