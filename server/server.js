const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configure ffmpeg globally
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const connectDB = require('./config/db');

const session = require("express-session");
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `[${req.method}] ${req.originalUrl} - status: ${res.statusCode} - ${duration}ms - IP: ${req.ip}`;
    if (res.statusCode >= 400) {
      console.error(`💥 ERROR: ${logMessage}`);
    } else {
      console.log(`✅ SUCCESS: ${logMessage}`);
    }
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for video chunk uploads as it requires many requests
    if (req.originalUrl === '/api/videos/upload-chunk') return true;
    
    // Skip rate limit for video streaming
    if (req.path.includes('/videos/') && req.path.includes('/stream')) return true;
    
    // Skip rate limit for authentication to avoid 429 when logging in with token
    if (req.originalUrl.startsWith('/api/auth')) return true;
    
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
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https:", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'self'"],
      "img-src": ["'self'", "data:", "https:"],
      "object-src": ["'none'"],
      "script-src": ["'self'", "https:", "'unsafe-inline'"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"],
      // Tắt upgrade-insecure-requests trên localhost để tránh lỗi chrome-error
      "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginOpenerPolicy: { policy: "unsafe-none" } // Cho phép popup/redirect của Google OAuth
}));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
}));

// Increased limits for large video chunks (up to 100MB per chunk)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

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

// Error Logger
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  console.error(`Message: ${err.message}`);
  next(err);
});

// Error handler (must be last)
app.use(require('./middleware/errorHandler'));

// Create HTTP server + attach Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Init chat socket
const initChatSocket = require('./socket/chatSocket');
initChatSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Server running on port ${PORT}      ║
║   Environment: ${process.env.NODE_ENV}       ║
║   API: http://localhost:${PORT}/api    ║
║   Socket.IO: ✅ Enabled               ║
╚═══════════════════════════════════════╝
  `);
});
