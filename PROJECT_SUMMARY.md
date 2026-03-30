# Tóm tắt dự án – Website bán khóa học

## 1. Tổng quan

**Tên dự án:** The-Website-Selling-Courses  
**Mô tả:** Nền tảng web bán khóa học trực tuyến với ba vai trò: **Admin**, **Giảng viên (Instructor)** và **Học viên (Student)**. Hỗ trợ đăng nhập email/mật khẩu và đăng nhập Google (OAuth 2.0).

---

## 2. Cấu trúc dự án

```
The-Website-Selling-Courses/
├── client/          # Frontend (React)
├── server/          # Backend (Node.js + Express)
└── PROJECT_SUMMARY.md
```

---

## 3. Công nghệ sử dụng

### 3.1 Client (`client/`)

| Công nghệ | Mục đích |
|-----------|----------|
| **React 19** | UI, component |
| **React Router DOM 7** | Điều hướng, bảo vệ route theo role |
| **Axios** | Gọi API |
| **TanStack React Query** | Quản lý cache & state server |
| **react-scripts (CRA)** | Build & dev server |

### 3.2 Server (`server/`)

| Công nghệ | Mục đích |
|-----------|----------|
| **Node.js + Express 5** | API REST |
| **MongoDB + Mongoose** | Cơ sở dữ liệu |
| **Passport** | Xác thực (JWT + Google OAuth 2.0) |
| **JWT (jsonwebtoken)** | Token đăng nhập |
| **bcryptjs** | Mã hóa mật khẩu |
| **Socket.io** | Realtime (nếu dùng) |
| **Multer + GridFS** | Upload file/video |
| **fluent-ffmpeg** | Xử lý video |
| **Helmet, CORS, express-rate-limit** | Bảo mật & giới hạn request |

---

## 4. Phân quyền & luồng ứng dụng

### 4.1 Vai trò

- **admin:** Quản lý toàn hệ thống (dashboard, khóa học, đơn hàng, người dùng).
- **instructor:** Quản lý khóa học của mình, tạo khóa, quản lý học viên.
- **student:** Xem dashboard, khóa đã mua.

### 4.2 Route chính (Client)

| Nhóm | Đường dẫn | Vai trò |
|------|-----------|---------|
| Đăng nhập | `/login` | Tất cả (chưa đăng nhập) |
| Admin | `/dashboard`, `/courses`, `/users`, `/orders` | admin |
| Giảng viên | `/instructor/dashboard`, `/instructor/courses`, `/instructor/create-course`, `/instructor/students` | instructor |
| Học viên | `/student/dashboard` | student |

Sau đăng nhập, user được chuyển về dashboard tương ứng theo `role`.

### 4.3 Bảo vệ route

- `PrivateRoute` và `allowedRoles` kiểm tra `user.role`; không đúng role thì không vào được trang.

---

## 5. API Backend

**Base URL:** `http://localhost:5000/api` (hoặc theo `PORT` trong `.env`)

| Tiền tố | Mô tả |
|---------|--------|
| `GET/POST /auth/*` | Đăng nhập (email/password), Google OAuth, `/me`, logout |
| `/courses` | CRUD khóa học, enroll |
| `/videos` | Chi tiết video, upload chunk, merge chunk, stream, xóa |
| `/orders` | CRUD đơn hàng |
| `/users` | CRUD người dùng (admin) |
| `GET /health` | Health check server |

### 5.1 Auth đáng chú ý

- **POST** `/api/auth/login` — Đăng nhập email + password.
- **GET** `/api/auth/google` — Chuyển hướng đăng nhập Google.
- **GET** `/api/auth/google/callback` — Callback Google, trả về redirect kèm token: `CLIENT_URL/auth/success?token=...`
- **GET** `/api/auth/me` — Lấy thông tin user hiện tại (header `Authorization: Bearer <token>`).
- **POST** `/api/auth/logout` — Đăng xuất (có middleware auth).

---

## 6. Cơ sở dữ liệu (MongoDB)

### 6.1 Các model chính

- **User:** `googleId`, `email`, `password`, `name`, `avatar`, `role` (student | instructor | admin), `purchasedCourses`, `createdAt`.
- **Course:** `title`, `description`, `price`, `thumbnail`, `instructor` (ref User), `videos` (ref Video), `category`, `level`, `students`, `rating`, `createdAt`.
- **Video:** (trong server, dùng cho bài giảng, upload/stream).
- **Order:** (đơn mua khóa học).

Kết nối DB qua biến môi trường `MONGODB_URI`.

---

## 7. Xác thực (Server)

- **Passport strategies:**
  - **Google OAuth 2.0:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
  - **JWT:** Bearer token với `JWT_SECRET`, `JWT_EXPIRE`.
- User đăng nhập Google lần đầu được tạo mới (lưu `googleId`, `email`, `name`, `avatar`); mặc định có thể là `student` (tùy logic trong `User` model/seed).

---

## 8. Frontend – State & API

- **AuthContext:** Lưu `user`, `loading`, `isAuthenticated`; cung cấp `login`, `logout`, `checkAuth`. Token lưu `localStorage` với key `token`.
- **api.js:** Axios instance gắn `Authorization: Bearer <token>`, xử lý 401 (xóa token và redirect `/login`). Các module: `authAPI`, `userAPI`, `courseAPI`, `videoAPI`, `orderAPI`, `healthCheck`.

---

## 9. Chạy dự án

### 9.1 Server

```bash
cd server
npm install
# Tạo file .env (xem mục 10)
npm run dev    # development (nodemon)
# hoặc
npm start      # production
```

Mặc định chạy tại `http://localhost:5000`.

### 9.2 Client

```bash
cd client
npm install
npm start
```

Mặc định chạy tại `http://localhost:3000`, proxy/API base URL trỏ tới server (ví dụ `http://localhost:5000/api`).

### 9.3 Database & seed (tùy chọn)

- Kết nối MongoDB qua `MONGODB_URI`.
- Có thể chạy seed: `npm run seed` (và `npm run seed:delete` nếu có), `npm run setup` (check DB).

---

## 10. Biến môi trường (gợi ý)

**Server (`server/.env`):**

- `PORT` — Cổng server (mặc định 5000).
- `MONGODB_URI` — Chuỗi kết nối MongoDB.
- `JWT_SECRET`, `JWT_EXPIRE` — JWT.
- `CLIENT_URL` — URL frontend (dùng CORS và redirect sau Google login).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — Google OAuth.

**Client:** Có thể dùng `.env` cho `REACT_APP_API_URL` nếu không hardcode `http://localhost:5000/api`.

---

## 11. Tóm tắt tính năng

| Tính năng | Mô tả ngắn |
|-----------|------------|
| Đăng nhập | Email/password + Google OAuth |
| Phân quyền | Admin, Instructor, Student với route riêng |
| Khóa học | CRUD, gán instructor, video, category, level |
| Video | Upload (chunk), merge, stream, xóa |
| Đơn hàng | Tạo/cập nhật đơn, gắn với user & khóa học |
| Người dùng | Admin quản lý user (CRUD) |
| Bảo mật | Helmet, CORS, rate limit, JWT, bcrypt |

---

## 12. Trang Admin – Chức năng hiện có

| Trang | Chức năng |
|-------|------------|
| **Dashboard** (`/dashboard`) | Thống kê: tổng khóa học, tổng học viên, tổng đơn hàng, doanh thu (từ đơn completed). Bảng đơn hàng gần đây (5 đơn) với mã đơn, khóa học, người mua, số tiền, trạng thái, ngày. |
| **Quản lý Khóa học** (`/courses`) | Danh sách khóa học dạng card (title, level, description, giá, số học viên, category, số video). **Thêm khóa học mới** (modal): title, description, price, category, level. **Sửa** và **Xóa** khóa học. |
| **Quản lý Người dùng** (`/users`) | Danh sách user (avatar, tên, email, role badge, số khóa đã mua, ngày tạo). Lọc theo role: Tất cả / Admin / Instructor / Student. Tìm kiếm theo tên hoặc email. **Xóa** user. (Nút **Sửa** có trên UI nhưng chưa gắn chức năng.) |
| **Quản lý Đơn hàng** (`/orders`) | Bảng đơn: mã đơn, khóa học, khách hàng, số tiền, phương thức, trạng thái, ngày tạo. Lọc: Tất cả / Chờ xử lý / Hoàn thành / Thất bại. **Cập nhật trạng thái** đơn pending (Duyệt → completed, Từ chối → failed). Summary: tổng doanh thu, số đơn chờ, tỷ lệ thành công. |

---

## 13. Trang Admin – Chức năng còn thiếu

| Khu vực | Chức năng gợi ý |
|---------|-----------------|
| **Dashboard** | Biểu đồ doanh thu/theo thời gian; lọc thống kê theo khoảng ngày; xuất báo cáo (CSV/Excel). |
| **Khóa học** | Gán **instructor** khi tạo/sửa khóa học; upload **thumbnail**; vào chi tiết khóa để **quản lý danh sách video** (thêm/xóa/sắp xếp); phân trang hoặc tìm kiếm khi danh sách dài. |
| **Người dùng** | **Sửa user** (đổi role, cập nhật tên/email); **thêm user** (admin tạo tài khoản); phân trang danh sách. |
| **Đơn hàng** | Xem **chi tiết đơn** (modal hoặc trang riêng); tìm kiếm theo mã đơn/email khách; xuất danh sách đơn. |
| **Hệ thống** | Trang **cài đặt** (ví dụ: cấu hình chung, danh mục khóa học); **đổi mật khẩu** cho admin; ghi log hành động quan trọng (audit log) nếu cần. |

---

## 14. Đăng nhập bằng Google

### 14.1 Đã có (Backend)

| Thành phần | Mô tả |
|------------|--------|
| **API** | `GET /api/auth/google` — chuyển hướng sang Google đăng nhập. |
| **Callback** | `GET /api/auth/google/callback` — Google trả về, server tạo/find user, sinh JWT, redirect: `CLIENT_URL/auth/success?token=...` |
| **Passport** | Cấu hình `passport-google-oauth20`, dùng `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`. |
| **User** | Model User có `googleId`; đăng nhập Google lần đầu tạo user mới (email, name, avatar từ profile). |

### 14.2 Còn thiếu (Frontend)

| Thành phần | Mô tả |
|------------|--------|
| **Nút đăng nhập Google** | Trang Login (`/login`) hiện chỉ có form email/password và Quick Login; chưa có nút/link “Đăng nhập bằng Google” trỏ đến `GET /api/auth/google` (hoặc redirect qua backend). |
| **Route xử lý callback** | Chưa có route `/auth/success` để đọc `token` từ query (`?token=...`), lưu vào `localStorage`, cập nhật AuthContext và chuyển về dashboard (hoặc trang mặc định theo role). |
| **AuthContext** | Chưa có hàm kiểu `loginWithToken(token)` để sau khi lấy token từ URL callback, set token + gọi `getMe` rồi set user và redirect. |

*Kết luận:* Backend đăng nhập Google đã sẵn sàng; cần bổ sung trên client: nút Google trên màn hình Login, route `/auth/success` xử lý token và tích hợp với AuthContext.

---

*File này được tạo để tóm tắt cấu trúc và cách vận hành của dự án The-Website-Selling-Courses (client + server).*
