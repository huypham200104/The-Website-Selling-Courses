# Course Platform - Backend Server

Backend API cho website bán khóa học sử dụng Node.js, Express và MongoDB.

## Cài đặt

### Yêu cầu
- Node.js v18 trở lên
- MongoDB Community Edition (hoặc MongoDB Atlas)
- FFmpeg (để xử lý video)

### Các bước cài đặt

1. **Cài đặt MongoDB:**

⚠️ **Quan trọng:** Phải cài MongoDB trước!

Chi tiết xem: [INSTALL_MONGODB.md](./INSTALL_MONGODB.md)

```bash
# Kiểm tra MongoDB đã cài chưa
mongod --version

# Khởi động MongoDB service
# Windows: Services → MongoDB → Start
# Hoặc: Start-Service MongoDB
```

2. **Cài đặt dependencies:**
```bash
npm install
```

2. **Cấu hình môi trường:**
Tạo file `.env` và cập nhật các giá trị:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/course_platform
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=5368709120
UPLOAD_PATH=./uploads
```

3. **Khởi động MongoDB:**
```bash
mongod
```

4. **Import dữ liệu mẫu (Seed Database):**

```bash
npm run seed
```

Xem chi tiết: [DATABASE_SEEDER.md](./DATABASE_SEEDER.md)

Sau khi seed, bạn sẽ có:
- 4 users (admin, instructor, 2 students)
- 5 courses
- 7 videos
- 2 orders

**Thông tin đăng nhập:**
- Admin: `admin@example.com` / `admin123`
- Instructor: `instructor@example.com` / `instructor123`
- Student: `student1@example.com` / `student123`

5. **Chạy server:**

Development mode (với nodemon):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Cấu trúc thư mục

```Health Check
- `GET /api/health` - Kiểm tra trạng thái server

### 
server/
├── config/           # Cấu hình database và passport
├── controllers/      # Xử lý logic nghiệp vụ
├── middleware/       # Middleware: auth, upload, error handler
├── models/          # Database models (MongoDB schemas)
├── routes/          # API routes
├── uploads/         # Thư mục lưu video
│   ├── chunks/      # Chunks tạm thời
│   └── videos/      # Video đã merge
├── utils/           # Utility functions
├── .env             # Biến môi trường
├── .gitignore       # Git ignore file
├── package.json     # Dependencies
└── server.js        # Entry point
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Đăng nhập bằng Google
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Lấy thông tin user hiện tại (Private)
- `POST /api/auth/logout` - Đăng xuất (Private)

### Courses
- `GET /api/courses` - Lấy tất cả khóa học
- `GET /api/courses/:id` - Lấy chi tiết khóa học
- `POST /api/courses` - Tạo khóa học mới (Instructor/Admin)
- `PUT /api/courses/:id` - Cập nhật khóa học (Instructor/Admin)
- `DELETE /api/courses/:id` - Xóa khóa học (Instructor/Admin)
- `POST /api/courses/:id/enroll` - Đăng ký khóa học (Private)

### Videos
- `POST /api/videos/upload-chunk` - Upload video chunk (Instructor/Admin)
- `POST /api/videos/merge-chunks` - Merge chunks thành video hoàn chỉnh (Instructor/Admin)
- `GET /api/videos/:id/stream` - Stream video (Private)
- `GET /api/videos/:id` - Lấy thông tin video (Private)
- `DELETE /api/videos/:id` - Xóa video (Instructor/Admin)

### Orders
- `POST /api/orders` - Tạo đơn hàng mới (Private)
- `GET /api/orders` - Lấy đơn hàng của user (Private)
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng (Private)
- `PUT /api/orders/:id` - Cập nhật trạng thái đơn hàng (Admin)

### Health Check
- `GET /api/health` - Kiểm tra trạng thái server

## User Roles

1. **Student**: Xem và mua khóa học
2. **Instructor**: Tạo và quản lý khóa học, upload video
3. **Admin**: Toàn quyền quản lý

## Tính năng bảo mật

1. **Video Protection:**
   - Chunked upload cho file lớn
   - Stream video thay vì download trực tiếp
   - JWT authentication cho mỗi video request
   - Kiểm tra quyền truy cập (đã mua khóa học)

2. **Authentication:**
   - Google OAuth 2.0
   - JWT tokens
   - Passport.js strategies

3. **Security:**
   - Helmet.js cho HTTP headers
   - CORS protection
  # Health Check
- `GET /api/health` - Kiểm tra trạng thái server

## NPM Scripts

```bash
# Development
npm run dev          # Chạy server với nodemon (auto-reload)
npm start           # Chạy server production mode

# Database
npm run seed        # Import dữ liệu mẫu vào MongoDB
npm run seed:delete # Xóa toàn bộ dữ liệu trong database
npm run setup       # Kiểm tra và seed nếu DB trống

# Testing
npm test            # Chạy tests (chưa implement)
```

## - Rate limiting
   - Input validation

## Lưu ý

1. **Google OAuth Setup:**
   - Truy cập https://console.cloud.google.com/
   - Tạo OAuth 2.0 Client ID
   - Thêm redirect URI: `http://localhost:5000/api/auth/google/callback`
   - Cập nhật GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env

2. **FFmpeg:**
   - Cần cài đặt FFmpeg để xử lý metadata video
   - Windows: https://ffmpeg.org/download.html
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

3. **MongoDB:**
   - Database tự động tạo khi server khởi động
   - Collection sẽ được tạo khi có data đầu tiên

## Testing

Sử dụng Postman hoặc Thunder Client để test API:

1. Import collection (nếu có)
2. Đăng nhập qua Google OAuth để lấy token
3. Thêm token vào Authorization header: `Bearer YOUR_TOKEN`

## Troubleshooting

### Port đã được sử dụng
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill
```

### MongoDB connection error
- Kiểm tra MongoDB đã chạy chưa
- Kiểm tra MONGODB_URI trong .env

### Upload video lỗi
- Kiểm tra thư mục uploads/ có quyền write
- Kiểm tra FFmpeg đã cài đặt

## Support

Nếu gặp vấn đề, check:
1. Logs trong terminal
2. MongoDB logs
3. File .env có đúng cấu hình không
