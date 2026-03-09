const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import config
const connectDB = require('./config/db');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => req.path.includes('/videos/') && req.path.includes('/stream')
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Database connection
connectDB().then(() => {
  console.log('📊 Database ready');
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/videos/:id/stream', streamLimiter);
app.use('/api/videos', require('./routes/videos'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));

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
