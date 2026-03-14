# DATABASE SEEDER - HƯỚNG DẪN SỬ DỤNG

## Giới thiệu

Hệ thống tự động tạo dữ liệu mẫu (seed data) để test và phát triển ứng dụng.

## Dữ liệu mẫu bao gồm:

### 👥 Users (4 users):
- **1 Admin** - Quản trị viên
- **1 Instructor** - Giảng viên (đã tạo 5 khóa học)
- **2 Students** - Học viên (1 người đã mua khóa học)

### 📚 Courses (5 khóa học):
1. React.js từ cơ bản đến nâng cao
2. Node.js & Express - RESTful API
3. JavaScript cơ bản cho người mới
4. Full Stack MERN
5. MongoDB từ cơ bản đến nâng cao

### 🎬 Videos (7 videos mẫu):
- React course: 3 videos
- Node.js course: 2 videos
- JavaScript course: 2 videos

### 💰 Orders (2 đơn hàng):
- 1 đơn đã hoàn thành
- 1 đơn đang pending

---

## Cách sử dụng

### 1. Import dữ liệu mẫu (Seed Database)

```bash
npm run seed
```

**Kết quả:**
- Xóa toàn bộ dữ liệu cũ (nếu có)
- Tạo mới 4 users, 5 courses, 7 videos, 2 orders
- Hiển thị thông tin đăng nhập

### 2. Xóa toàn bộ dữ liệu

```bash
npm run seed:delete
```

**Cảnh báo:** Lệnh này xóa TOÀN BỘ dữ liệu trong database!

### 3. Kiểm tra và tự động seed (nếu DB trống)

```bash
npm run setup
```

Lệnh này sẽ:
- Kiểm tra database có dữ liệu chưa
- Nếu trống → tự động chạy seeder
- Nếu có dữ liệu → thông báo và bỏ qua

---

## Thông tin đăng nhập sau khi seed

### 👨‍💼 ADMIN
```
Email: admin@example.com
Password: admin123
Role: admin
```

### 👨‍🏫 INSTRUCTOR
```
Email: instructor@example.com
Password: instructor123
Role: instructor
```

### 👨‍🎓 STUDENT 1
```
Email: student1@example.com
Password: student123
Role: student
Status: Đã mua 1 khóa học (React.js)
```

### 👨‍🎓 STUDENT 2
```
Email: student2@example.com
Password: student123
Role: student
Status: Chưa mua khóa học nào
```

---

## Workflow khuyến nghị

### Lần đầu setup project:
```bash
# 1. Khởi động MongoDB
mongod

# 2. Seed dữ liệu mẫu
npm run seed

# 3. Chạy server
npm run dev
```

### Khi cần reset dữ liệu:
```bash
# Xóa dữ liệu cũ
npm run seed:delete

# Tạo lại dữ liệu mới
npm run seed
```

### Production:
```bash
# KHÔNG chạy seeder trong production!
# Chỉ import dữ liệu thực từ backup hoặc migration
```

---

## Cấu trúc Files

```
server/
├── seeds/
│   ├── seedData.js      # Dữ liệu mẫu (template)
│   └── seeder.js        # Script import/delete data
├── scripts/
│   └── checkDatabase.js # Tự động seed nếu DB trống
```

---

## Test sau khi seed

### 1. Kiểm tra MongoDB
```bash
# Mở MongoDB Compass
# Connect: mongodb://localhost:27017
# Database: course_platform
# Xem các collections: users, courses, videos, orders
```

### 2. Test API với Postman

**Login (không cần auth):**
```http
GET http://localhost:5000/api/courses
```

**Get courses:**
```http
GET http://localhost:5000/api/courses
```

**Login với Google OAuth** (cần setup):
```http
GET http://localhost:5000/api/auth/google
```

### 3. Test với dữ liệu mẫu

1. Đăng nhập với account student1@example.com
2. Vào "My Courses" → thấy 1 khóa học React.js
3. Click vào course → thấy 3 videos
4. Stream video (nếu có file thật)

---

## Troubleshooting

### Lỗi: MongoDB connection refused
```bash
# Kiểm tra MongoDB đã chạy chưa
mongod

# Hoặc Windows Services → MongoDB Server → Start
```

### Lỗi: Duplicate key error
```bash
# Xóa dữ liệu cũ trước
npm run seed:delete

# Rồi seed lại
npm run seed
```

### Lỗi: Cannot find module
```bash
# Cài lại dependencies
npm install
```

---

## Notes quan trọng

⚠️ **Lưu ý:**
1. **Seeder chỉ dùng cho DEVELOPMENT**
2. Videos trong seed data chỉ là placeholder (chưa có file thật)
3. Password được hash bằng bcrypt
4. Mỗi lần seed sẽ XÓA toàn bộ dữ liệu cũ

💡 **Tips:**
- Chạy `npm run seed` mỗi khi cần dữ liệu sạch để test
- Dùng MongoDB Compass để xem dữ liệu trực quan
- Tạo thêm dữ liệu mẫu trong `seeds/seedData.js` nếu cần

---

**Happy Coding! 🚀**
