const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Configure ffmpeg globally
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const connectDB = require('./config/db');

const session = require("express-session");
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for video chunk uploads as it requires many requests
    if (req.originalUrl === '/api/videos/upload-chunk') return true;
    
    // Skip rate limit for video streaming
    if (req.path.includes('/videos/') && req.path.includes('/stream')) return true;
    
    return false;
  }
});

// Separate, generous limiter for video streaming chunks
const streamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // plenty for large videos
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
}));

// Increased limits for large video chunks (up to 100MB per chunk)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(limiter);

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport config
require('./config/passport')(passport);

// Database connection
connectDB().then(() => {
  console.log('📊 Database ready');
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
});

// Serve static files
const path = require('path');
app.use('/uploads/receipts', express.static(path.join(__dirname, 'uploads/receipts')));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/videos/:id/stream', streamLimiter);
app.use('/api/videos', require('./routes/videos'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/quizzes', require('./routes/quizResult'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler (must be last)
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Server running on port ${PORT}      ║
║   Environment: ${process.env.NODE_ENV}       ║
║   API: http://localhost:${PORT}/api    ║
╚═══════════════════════════════════════╝
  `);
});
