# 🎓 The Website Selling Courses

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248.svg?logo=mongodb)
![Express](https://img.shields.io/badge/Express-5.x-000000.svg?logo=express)

**Nền tảng web bán khóa học trực tuyến** — hỗ trợ 3 vai trò: Admin · Giảng viên · Học viên

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Biến môi trường](#-biến-môi-trường)
- [API Endpoints](#-api-endpoints)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [Tài khoản mặc định (Seed)](#-tài-khoản-mặc-định-seed)
- [Bảo mật](#-bảo-mật)
- [Tính năng sắp ra mắt](#-tính-năng-sắp-ra-mắt)

---

## 🎯 Giới thiệu

**The Website Selling Courses** là một nền tảng học trực tuyến (e-learning) full-stack, được xây dựng với **React** (frontend) và **Node.js + Express + MongoDB** (backend). Hệ thống cho phép:

- 🛡️ **Admin** quản lý toàn bộ hệ thống: khóa học, người dùng, đơn hàng.
- 👨‍🏫 **Giảng viên (Instructor)** tạo và quản lý khóa học, tải lên video bài giảng, tạo quiz.
- 👨‍🎓 **Học viên (Student)** mua khóa học, xem video, làm bài kiểm tra, nhắn tin với giảng viên.

---

## ✨ Tính năng chính

### 🔐 Xác thực & Phân quyền
- Đăng ký / Đăng nhập bằng **email + mật khẩu**
- Đăng nhập bằng **Google OAuth 2.0**
- Phân quyền **3 cấp**: Admin · Instructor · Student
- Bảo vệ route theo vai trò (`PrivateRoute`)
- JWT Token (lưu `localStorage`)

### 📚 Quản lý Khóa học
- Tạo / Sửa / Xóa khóa học (Instructor & Admin)
- Phân loại theo **danh mục** và **cấp độ** (Beginner / Intermediate / Advanced)
- Admin **duyệt / từ chối** khóa học trước khi public
- Học viên có thể **đăng ký** (enroll) khóa học
- Hệ thống **đánh giá & xếp hạng** (1–5 sao)
- Yêu thích (favorites) khóa học

### 🎬 Quản lý Video
- Upload video dung lượng lớn (**tối đa 5GB**) theo **chunk** (từng phần)
- Tự động **ghép chunks** sau khi upload xong
- **Trích xuất metadata** video (thời lượng, kích thước) bằng FFprobe
- **Streaming video** an toàn với stream token tạm thời
- Hỗ trợ nhiều chất lượng: 360p / 480p / 720p / 1080p
- Range requests cho phép tua video mượt mà

### 📝 Bài kiểm tra (Quiz)
- Giảng viên tạo quiz với câu hỏi **trắc nghiệm nhiều lựa chọn**
- Học viên làm bài, hệ thống **chấm điểm tự động**
- Lưu **lịch sử kết quả** bài làm

### 💳 Đơn hàng & Thanh toán
- Học viên tạo đơn hàng mua khóa học
- Upload **minh chứng thanh toán** (ảnh chuyển khoản)
- Admin **duyệt / từ chối** đơn hàng thủ công
- Theo dõi lịch sử đơn hàng

### 💬 Nhắn tin Real-time
- Chat trực tiếp giữa **học viên** và **giảng viên** qua Socket.IO
- Lưu **lịch sử tin nhắn** vào MongoDB

### 📊 Dashboard Admin
- Thống kê tổng quan: Tổng khóa học · Tổng học viên · Doanh thu · Đơn hàng
- Quản lý người dùng: Tìm kiếm, lọc theo vai trò, xóa
- Quản lý đơn hàng: Lọc theo trạng thái, cập nhật trạng thái
- Danh sách đơn hàng gần đây

### 📊 Dashboard Giảng viên
- Thống kê khóa học đã tạo và học viên tham gia
- Quản lý danh sách video theo từng khóa

---

## 🛠️ Công nghệ sử dụng

### Frontend (`client/`)

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| **React** | ^19.x | UI Framework |
| **React Router DOM** | ^7.x | Điều hướng client-side |
| **TanStack React Query** | ^5.x | Quản lý server state & cache |
| **Axios** | ^1.x | HTTP Client |
| **Socket.io-client** | ^4.x | Nhắn tin real-time |

### Backend (`server/`)

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| **Node.js** | 18+ | Runtime |
| **Express** | ^5.x | Web framework |
| **MongoDB + Mongoose** | ^9.x | Cơ sở dữ liệu |
| **Passport.js** | ^0.7 | Xác thực |
| **passport-google-oauth20** | ^2.x | Google OAuth 2.0 |
| **passport-jwt** | ^4.x | JWT Strategy |
| **jsonwebtoken** | ^9.x | Tạo & xác thực JWT |
| **bcryptjs** | ^3.x | Mã hóa mật khẩu |
| **Socket.io** | ^4.x | WebSocket real-time |
| **Multer** | ^1.x | Upload file |
| **multer-gridfs-storage** | ^5.x | Lưu file vào MongoDB GridFS |
| **fluent-ffmpeg** | ^2.x | Xử lý video |
| **ffmpeg-static** | ^5.x | FFmpeg binary |
| **ffprobe-static** | ^3.x | FFprobe binary |
| **Helmet** | ^8.x | HTTP security headers |
| **cors** | ^2.x | Xử lý CORS |
| **express-rate-limit** | ^8.x | Giới hạn request |
| **dotenv** | ^17.x | Biến môi trường |

---

## 📁 Cấu trúc dự án

```
The-Website-Selling-Courses/
├── client/                          # React Frontend
│   ├── public/
│   └── src/
│       ├── components/              # UI Components tái sử dụng
│       ├── context/                 # React Context (Auth, Language)
│       ├── pages/                   # Các trang (Admin, Instructor, Student)
│       ├── services/                # Axios API services
│       ├── App.js                   # Router & route guards
│       └── index.js
│
├── server/                          # Node.js/Express Backend
│   ├── config/
│   │   ├── db.js                    # Kết nối MongoDB
│   │   └── passport.js              # Cấu hình Passport strategies
│   ├── controllers/                 # Business logic
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── videoController.js
│   │   ├── orderController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js                  # Xác thực JWT
│   │   ├── roleCheck.js             # Kiểm tra phân quyền
│   │   ├── upload.js                # Upload video (Multer)
│   │   ├── uploadImage.js           # Upload ảnh
│   │   └── errorHandler.js          # Xử lý lỗi toàn cục
│   ├── models/
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Video.js
│   │   ├── Order.js
│   │   ├── Message.js
│   │   └── QuizResult.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── videos.js
│   │   ├── orders.js
│   │   ├── users.js
│   │   └── admin.js
│   ├── seeds/                       # Dữ liệu mẫu
│   ├── socket/
│   │   └── chatSocket.js            # Socket.IO chat handler
│   ├── uploads/                     # Thư mục lưu file tải lên
│   │   ├── videos/
│   │   └── receipts/
│   ├── .env                         # Biến môi trường
│   ├── package.json
│   └── server.js                    # Entry point
│
├── package.json                     # Root dependencies
├── PROJECT_SUMMARY.md
└── README.md
```

---

## ⚙️ Yêu cầu hệ thống

Trước khi cài đặt, hãy đảm bảo máy tính của bạn đã cài:

| Công cụ | Phiên bản tối thiểu | Tải về |
|---------|---------------------|--------|
| **Node.js** | v18.0+ | [nodejs.org](https://nodejs.org) |
| **npm** | v9.0+ | Đi kèm Node.js |
| **MongoDB** | v6.0+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **FFmpeg** | Bất kỳ | [ffmpeg.org](https://ffmpeg.org/download.html) *(tùy chọn — đã có binary static)* |

---

## 🚀 Cài đặt & Chạy dự án

### Bước 1: Clone repository

```bash
git clone https://github.com/huypham200104/The-Website-Selling-Courses.git
cd The-Website-Selling-Courses
```

### Bước 2: Cài đặt và khởi động Backend (Server)

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Tạo file .env (xem hướng dẫn bên dưới)
cp .env.example .env   # Hoặc tạo thủ công file .env

# (Tùy chọn) Seed dữ liệu mẫu
npm run seed

# Khởi động server ở chế độ phát triển (auto-reload)
npm run dev

# Hoặc chạy production
npm start
```

> 🟢 Server chạy tại: **http://localhost:5000**

### Bước 3: Cài đặt và khởi động Frontend (Client)

Mở terminal mới:

```bash
# Di chuyển vào thư mục client
cd client

# Cài đặt dependencies
npm install

# Khởi động React dev server
npm start
```

> 🟢 Client chạy tại: **http://localhost:3000**

### Lệnh hữu ích khác

```bash
# Seed dữ liệu mẫu vào database
npm run seed

# Xóa toàn bộ dữ liệu trong database
npm run seed:delete

# Kiểm tra database và seed nếu rỗng
npm run setup

# Build client cho production
cd client && npm run build
```

---

## 🔧 Biến môi trường

Tạo file `.env` trong thư mục `server/` với nội dung sau:

```env
# =========================
# Server Configuration
# =========================
PORT=5000
NODE_ENV=development

# =========================
# Database
# =========================
MONGODB_URI=mongodb://localhost:27017/selling_courses

# =========================
# JWT Authentication
# =========================
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# =========================
# Google OAuth 2.0
# =========================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# =========================
# Client URL (for CORS & redirects)
# =========================
CLIENT_URL=http://localhost:3000

# =========================
# File Upload
# =========================
MAX_FILE_SIZE=5368709120
UPLOAD_PATH=./uploads

# =========================
# (Optional) Gemini AI
# =========================
GEMINI_API_KEY=your_gemini_api_key

# =========================
# (Optional) Bypass Google OAuth in dev
# =========================
MOCK_GOOGLE_LOGIN=false
```

> ⚠️ **Lưu ý bảo mật:** Không commit file `.env` lên git. File này đã được thêm vào `.gitignore`.

---

## 📡 API Endpoints

**Base URL:** `http://localhost:5000/api`

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/auth/login` | Đăng nhập email/password | Public |
| `GET` | `/auth/google` | Chuyển hướng Google OAuth | Public |
| `GET` | `/auth/google/callback` | Callback từ Google | Public |
| `GET` | `/auth/me` | Lấy thông tin người dùng hiện tại | 🔒 Private |
| `PUT` | `/auth/profile` | Cập nhật hồ sơ | 🔒 Private |
| `POST` | `/auth/logout` | Đăng xuất | 🔒 Private |
| `POST` | `/auth/favorites/:courseId` | Thêm vào yêu thích | 🔒 Private |
| `DELETE` | `/auth/favorites/:courseId` | Bỏ yêu thích | 🔒 Private |

### 📚 Courses (`/api/courses`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/courses` | Danh sách khóa học | Public |
| `GET` | `/courses/:id` | Chi tiết khóa học | Public |
| `POST` | `/courses` | Tạo khóa học mới | 🔒 Instructor/Admin |
| `PUT` | `/courses/:id` | Cập nhật khóa học | 🔒 Instructor/Admin |
| `DELETE` | `/courses/:id` | Xóa khóa học | 🔒 Instructor/Admin |
| `PUT` | `/courses/:id/status` | Duyệt/từ chối khóa học | 🔒 Admin |
| `POST` | `/courses/:id/enroll` | Đăng ký học | 🔒 Private |
| `GET` | `/courses/:id/students` | Danh sách học viên | 🔒 Instructor/Admin |
| `GET` | `/courses/:id/reviews` | Đánh giá khóa học | 🔒 Private |
| `POST` | `/courses/:id/reviews` | Tạo đánh giá | 🔒 Student |
| `POST` | `/courses/:id/quizzes` | Tạo quiz | 🔒 Instructor/Admin |
| `DELETE` | `/courses/:id/quizzes/:quizId` | Xóa quiz | 🔒 Instructor/Admin |

### 🎬 Videos (`/api/videos`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/videos/upload-chunk` | Upload một chunk video | 🔒 Instructor/Admin |
| `POST` | `/videos/merge-chunks` | Ghép các chunks thành video | 🔒 Instructor/Admin |
| `GET` | `/videos/:id` | Chi tiết video | 🔒 Private |
| `GET` | `/videos/:id/stream-token` | Lấy token stream tạm thời | 🔒 Private |
| `GET` | `/videos/:id/stream` | Stream video | 🔒 Private |
| `DELETE` | `/videos/:id` | Xóa video | 🔒 Instructor/Admin |

### 💳 Orders (`/api/orders`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/orders` | Tạo đơn hàng | 🔒 Private |
| `GET` | `/orders` | Danh sách đơn hàng của tôi | 🔒 Private |
| `GET` | `/orders/:id` | Chi tiết đơn hàng | 🔒 Private |
| `PUT` | `/orders/:id/proof` | Upload minh chứng thanh toán | 🔒 Private |
| `PUT` | `/orders/:id` | Cập nhật trạng thái đơn | 🔒 Admin |

### 👥 Users (`/api/users`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/users` | Danh sách người dùng | 🔒 Admin |
| `GET` | `/users/:id` | Chi tiết người dùng | 🔒 Admin |
| `PUT` | `/users/:id` | Cập nhật người dùng | 🔒 Admin |
| `DELETE` | `/users/:id` | Xóa người dùng | 🔒 Admin |

### 📊 Admin (`/api/admin`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/admin/stats` | Thống kê hệ thống | 🔒 Admin |

### 🏥 Health Check

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/health` | Kiểm tra trạng thái server | Public |

---

## 🗄️ Cơ sở dữ liệu

Dự án sử dụng **MongoDB** với các collection sau:

### User
```
email, password (bcrypt), name, avatar, role (student|instructor|admin),
googleId, purchasedCourses[], favorites[], createdAt
```

### Course
```
title, description, price, thumbnail, instructor (ref: User),
videos[] (ref: Video), category, level (beginner|intermediate|advanced),
quizzes[], students[] (ref: User), reviews[], rating, reviewCount,
status (pending|published|rejected), createdAt
```

### Video
```
courseId (ref: Course), title, description, videoUrl,
duration, order, size, quality[], createdAt
```

### Order
```
userId (ref: User), courseId (ref: Course), amount,
status (pending|completed|failed), paymentMethod,
transactionId, paymentProof, createdAt
```

### Message
```
senderId (ref: User), receiverId (ref: User), content, timestamp
```

### QuizResult
```
userId (ref: User), courseId (ref: Course), quizId,
score, answers[], completedAt
```

---

## 👤 Tài khoản mặc định (Seed)

Sau khi chạy `npm run seed`, hệ thống sẽ có dữ liệu mẫu:

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| **Admin** | admin@example.com | admin123 |
| **Instructor** | instructor@example.com | instructor123 |
| **Student** | student1@example.com | student123 |
| **Student** | student2@example.com | student123 |

> ⚠️ **Lưu ý:** Hãy đổi mật khẩu sau khi triển khai lên môi trường production.

Dữ liệu mẫu bao gồm:
- **5 khóa học** với các danh mục khác nhau
- **7 video** bài giảng
- **2 đơn hàng** với các trạng thái khác nhau

---

## 🔒 Bảo mật

Dự án áp dụng các biện pháp bảo mật sau:

| Biện pháp | Thư viện | Mô tả |
|-----------|---------|-------|
| **HTTP Security Headers** | Helmet.js | Ngăn chặn các tấn công phổ biến (XSS, clickjacking...) |
| **CORS Protection** | cors | Kiểm soát các origin được phép truy cập |
| **Rate Limiting** | express-rate-limit | Giới hạn 100 req/15 phút/IP |
| **Password Hashing** | bcryptjs | Mã hóa mật khẩu một chiều |
| **JWT Authentication** | jsonwebtoken | Token xác thực stateless |
| **Role-based Access** | Custom middleware | Phân quyền theo vai trò |
| **Video Access Control** | Stream token | Chỉ học viên đã mua mới xem được video |
| **Input Validation** | Mongoose validators | Kiểm tra dữ liệu đầu vào |

---

## 🗺️ Tính năng sắp ra mắt

- [ ] 💳 **Tích hợp thanh toán tự động** (VNPAY, MoMo, ZaloPay, PayOS)
- [ ] 🎟️ **Mã giảm giá** (Coupons/Vouchers)
- [ ] 📈 **Theo dõi tiến độ học tập** (% hoàn thành khóa học)
- [ ] 🏆 **Cấp chứng chỉ** (PDF) khi hoàn thành khóa học
- [ ] 📧 **Gửi email tự động** (xác nhận đơn hàng, nhắc học)
- [ ] 📊 **Biểu đồ doanh thu** theo tháng/tuần
- [ ] 💬 **Bình luận** dưới mỗi video bài giảng
- [ ] 🎬 **Video Player nâng cao** (HLS streaming, ghi nhớ thời gian xem)
- [ ] 👨‍🏫 **Quyền Giảng viên Marketplace** (giảng viên tự đăng khóa học)

---

## 📄 Giấy phép

Dự án này được phân phối theo giấy phép **MIT**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 👨‍💻 Tác giả

**Huy Phạm** — [@huypham200104](https://github.com/huypham200104)

---

<div align="center">
  <p>⭐ Nếu dự án này hữu ích với bạn, hãy cho một ngôi sao trên GitHub nhé!</p>
</div>
