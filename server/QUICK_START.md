# HƯỚNG DẪN NHANH - KHỞI ĐỘNG SERVER

## Bước 1: Cài đặt MongoDB

### Windows:
1. Download MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Cài đặt với cấu hình mặc định
3. Khởi động MongoDB:
```bash
# Mở MongoDB Compass hoặc chạy:
mongod
```

### Kiểm tra MongoDB đã chạy:
```bash
# Mở MongoDB Compass và kết nối đến: mongodb://localhost:27017
```

---

## Bước 2: Cấu hình Google OAuth (Tạm thời bỏ qua nếu chưa cần)

1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới
3. Enable Google+ API
4. Credentials > Create Credentials > OAuth 2.0 Client ID
5. Thêm Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID và Client Secret
7. Cập nhật vào file `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Lưu ý:** Nếu chưa setup Google OAuth, server vẫn chạy được nhưng không thể đăng nhập.

---

## Bước 3: Khởi động Server

```bash
# Chạy development mode (tự động restart khi code thay đổi)
npm run dev

# Hoặc chạy production mode
npm start
```

Server sẽ chạy tại: **http://localhost:5000**

---

## Bước 4: Test API

### Health Check:
```bash
# Mở browser hoặc Postman
GET http://localhost:5000/api/health
```

Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-04T..."
}
```

### Test các endpoint khác:

#### 1. Lấy danh sách khóa học (không cần auth):
```
GET http://localhost:5000/api/courses
```

#### 2. Đăng nhập Google (cần setup OAuth):
```
GET http://localhost:5000/api/auth/google
```

---

## Bước 5: Tạo dữ liệu test (Optional)

Bạn có thể sử dụng MongoDB Compass để tạo collection và document thủ công:

1. Mở MongoDB Compass
2. Connect đến `mongodb://localhost:27017`
3. Tạo database: `course_platform`
4. Tạo collection: `users`, `courses`, `videos`, `orders`

Hoặc sử dụng Postman để gọi API tạo dữ liệu (cần authentication).

---

## Troubleshooting

### Lỗi: Port 5000 already in use
```bash
# Windows - Tìm và kill process
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Hoặc thay đổi PORT trong .env
PORT=5001
```

### Lỗi: MongoDB connection refused
```bash
# Kiểm tra MongoDB đang chạy
# Windows: Mở Services > MongoDB Server > Start
# Hoặc chạy: mongod
```

### Lỗi: FFmpeg not found
```bash
# Download FFmpeg: https://ffmpeg.org/download.html
# Giải nén và thêm vào PATH
# Hoặc để tạm (chức năng upload video sẽ bị lỗi metadata)
```

---

## Next Steps

1. ✅ Server đã chạy
2. ⏳ Setup Google OAuth để test đăng nhập
3. ⏳ Test upload video
4. ⏳ Tích hợp với Frontend React
5. ⏳ Deploy lên production

---

## Các lệnh quan trọng

```bash
# Cài đặt dependencies
npm install

# Chạy development mode
npm run dev

# Chạy production
npm start

# Kiểm tra version node
node --version

# Kiểm tra MongoDB
mongod --version
```

---

**Chúc bạn code vui vẻ! 🚀**
