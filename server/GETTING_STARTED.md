# 🚀 BẮT ĐẦU NHANH - GETTING STARTED

Hướng dẫn chi tiết cho người mới bắt đầu setup project từ đầu.

---

## 📋 CHECKLIST CÀI ĐẶT

- [ ] Node.js v18+ đã cài
- [ ] MongoDB đã cài hoặc MongoDB Atlas account
- [ ] Dependencies đã install
- [ ] File .env đã config
- [ ] Database đã seed dữ liệu mẫu
- [ ] Server chạy thành công

---

## BƯỚC 1: KIỂM TRA NODE.JS

```bash
node --version
```

Nếu chưa có Node.js:
- Download: https://nodejs.org/
- Chọn LTS version
- Cài đặt và restart terminal

---

## BƯỚC 2: CÀI ĐẶT MONGODB

### Option A: MongoDB Local (Khuyến nghị cho dev)

**Xem hướng dẫn chi tiết:** [INSTALL_MONGODB.md](./INSTALL_MONGODB.md)

**Quick steps:**
1. Download: https://www.mongodb.com/try/download/community
2. Cài đặt MongoDB Community Edition
3. Cài MongoDB Compass (GUI tool)
4. Khởi động service

**Test:**
```bash
mongod --version
```

### Option B: MongoDB Atlas (Cloud - Miễn phí)

1. Đăng ký: https://www.mongodb.com/cloud/atlas/register
2. Tạo free cluster (M0)
3. Setup user & network access
4. Copy connection string

---

## BƯỚC 3: CÀI ĐẶT DEPENDENCIES

```bash
# Đảm bảo bạn đang ở thư mục server
cd server

# Cài đặt tất cả packages
npm install
```

**Thời gian:** ~1-2 phút

**Packages được cài:**
- express, mongoose, passport
- jsonwebtoken, bcryptjs
- multer, fluent-ffmpeg
- socket.io, cors, helmet
- và nhiều hơn nữa...

---

## BƯỚC 4: CẤU HÌNH ENVIRONMENT VARIABLES

File `.env` đã có sẵn trong project. Cần cập nhật:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/course_platform
# Nếu dùng Atlas: mongodb+srv://...

# JWT Secret - PHẢI THAY ĐỔI!
JWT_SECRET=your_super_secret_key_change_this_in_production_123456

# Google OAuth (Tạm bỏ qua nếu chưa setup)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Các config khác giữ nguyên
```

### Tạo JWT Secret mạnh:

```bash
# Tạo random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy kết quả và paste vào `JWT_SECRET` trong file .env

---

## BƯỚC 5: KHỞI ĐỘNG MONGODB

### Nếu dùng MongoDB Local:

**Windows:**
```bash
# Cách 1: Services
# Windows + R → services.msc → Tìm MongoDB → Start

# Cách 2: PowerShell
Start-Service MongoDB

# Cách 3: Terminal
mongod
```

**Test kết nối:**
- Mở MongoDB Compass
- Connect to: `mongodb://localhost:27017`
- Nếu thành công → ✅ Ready!

### Nếu dùng MongoDB Atlas:

Không cần khởi động, chỉ cần connection string trong .env

---

## BƯỚC 6: SEED DATABASE (Tạo dữ liệu mẫu)

```bash
npm run seed
```

**Kết quả mong đợi:**

```
🚀 Starting data import...

🗑️  Clearing old data...
✅ Old data cleared

👤 Creating users...
✅ Created 4 users

📚 Creating courses...
✅ Created 5 courses

🎬 Creating videos...
✅ Created 7 videos

💰 Creating orders...
✅ Created 2 orders

🎉 DATA IMPORT SUCCESSFUL!

📋 LOGIN CREDENTIALS:

👨‍💼 ADMIN:
   Email: admin@example.com
   Password: admin123

👨‍🏫 INSTRUCTOR:
   Email: instructor@example.com
   Password: instructor123

👨‍🎓 STUDENTS:
   Email: student1@example.com
   Password: student123
```

**Xem chi tiết:** [DATABASE_SEEDER.md](./DATABASE_SEEDER.md)

---

## BƯỚC 7: KHỞI ĐỘNG SERVER

```bash
# Development mode (auto-reload khi code thay đổi)
npm run dev
```

**Kết quả mong đợi:**

```
✅ MongoDB Connected: localhost
📂 Database: course_platform
📊 Database ready

╔═══════════════════════════════════════╗
║   Server running on port 5000         ║
║   Environment: development            ║
║   API: http://localhost:5000/api      ║
╚═══════════════════════════════════════╝
```

✅ **Nếu thấy thông báo này → THÀNH CÔNG!**

---

## BƯỚC 8: TEST API

### Test 1: Health Check

**Browser:**
```
http://localhost:5000/api/health
```

**Kết quả:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-04T..."
}
```

### Test 2: Get Courses

**Browser:**
```
http://localhost:5000/api/courses
```

**Kết quả:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "...",
      "title": "Khóa học React.js từ cơ bản đến nâng cao",
      "price": 499000,
      ...
    }
  ]
}
```

### Test 3: Dùng Postman/Thunder Client

1. **Install Postman:** https://www.postman.com/downloads/
2. Test các endpoints:
   - GET `http://localhost:5000/api/courses`
   - GET `http://localhost:5000/api/courses/:id`

---

## BƯỚC 9: XEM DỮ LIỆU TRONG MONGODB

### Dùng MongoDB Compass (Khuyến nghị):

1. Mở MongoDB Compass
2. Connect: `mongodb://localhost:27017`
3. Chọn database: `course_platform`
4. Xem các collections:
   - `users` (4 documents)
   - `courses` (5 documents)
   - `videos` (7 documents)
   - `orders` (2 documents)

### Dùng MongoDB Shell:

```bash
mongosh

> use course_platform
> db.users.find().pretty()
> db.courses.find().pretty()
> exit
```

---

## TROUBLESHOOTING

### ❌ Lỗi: MongoDB connection refused

**Giải pháp:**
```bash
# Kiểm tra MongoDB đang chạy
Get-Service MongoDB

# Nếu stopped, khởi động:
Start-Service MongoDB

# Hoặc:
mongod
```

### ❌ Lỗi: Port 5000 already in use

**Giải pháp:**
```bash
# Tìm process đang dùng port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID_NUMBER> /F

# Hoặc đổi port trong .env
PORT=5001
```

### ❌ Lỗi: Cannot find module

**Giải pháp:**
```bash
# Xóa node_modules và cài lại
Remove-Item -Recurse -Force node_modules
npm install
```

### ❌ Lỗi: Seeder fails

**Giải pháp:**
```bash
# Xóa dữ liệu cũ
npm run seed:delete

# Seed lại
npm run seed
```

---

## NEXT STEPS

✅ Server đã chạy thành công!

**Bước tiếp theo:**

1. **Setup Google OAuth** (Optional):
   - Xem hướng dẫn trong [README.md](./README.md) phần "Google OAuth Setup"
   - Cập nhật GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env

2. **Tạo Frontend React:**
   - Chuyển sang thư mục `client/`
   - Setup React app
   - Tích hợp với API

3. **Upload Video thật:**
   - Test chunked upload
   - Test video streaming

4. **Deploy:**
   - Deploy MongoDB lên Atlas
   - Deploy backend lên Railway/Render
   - Deploy frontend lên Vercel/Netlify

---

## USEFUL COMMANDS

```bash
# Development
npm run dev              # Chạy server (auto-reload)
npm start               # Chạy server (production)

# Database
npm run seed            # Seed dữ liệu mẫu
npm run seed:delete     # Xóa toàn bộ data
npm run setup           # Auto seed nếu DB trống

# MongoDB
mongod                  # Khởi động MongoDB
mongosh                 # Mở MongoDB shell
Start-Service MongoDB   # Start service (Windows)
Stop-Service MongoDB    # Stop service (Windows)
```

---

## CẤU TRÚC PROJECT

```
server/
├── config/          # Database & passport config
├── controllers/     # Business logic
├── middleware/      # Auth, upload, error handling
├── models/         # MongoDB schemas
├── routes/         # API endpoints
├── seeds/          # Database seeder
├── scripts/        # Utility scripts
├── uploads/        # Video storage
├── utils/          # Helper functions
├── .env            # Environment variables
├── server.js       # Entry point
└── package.json    # Dependencies
```

---

## TÀI LIỆU THAM KHẢO

- [README.md](./README.md) - Tài liệu đầy đủ
- [INSTALL_MONGODB.md](./INSTALL_MONGODB.md) - Hướng dẫn cài MongoDB
- [DATABASE_SEEDER.md](./DATABASE_SEEDER.md) - Chi tiết về seeder
- [QUICK_START.md](./QUICK_START.md) - Hướng dẫn nhanh

---

**🎉 CHÚC MỪNG! BẠN ĐÃ SETUP THÀNH CÔNG SERVER!**

Nếu gặp vấn đề, check lại từng bước hoặc xem phần Troubleshooting.

**Happy Coding! 🚀**
