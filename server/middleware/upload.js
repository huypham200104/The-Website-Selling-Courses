const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = './uploads/chunks';
const videoDir = './uploads/videos';
const thumbDir = './uploads/thumbnails';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

// Storage configuration for chunks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mov|wmv|flv|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) },
  fileFilter: fileFilter
});

// Thumbnail storage (images)
const thumbStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, thumbDir),
  filename: (req, file, cb) => {
    const uniqueName = `thumb-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname) || '.jpg'}`;
    cb(null, uniqueName);
  }
});

const thumbFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = (file.mimetype || '').match(/image/);
  if (allowed.test(ext) && mimetype) return cb(null, true);
  cb(new Error('Chỉ chấp nhận file ảnh (jpeg, png, gif, webp)'));
};

const uploadThumbnail = multer({
  storage: thumbStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: thumbFileFilter
});

module.exports = upload;
module.exports.uploadThumbnail = uploadThumbnail;
