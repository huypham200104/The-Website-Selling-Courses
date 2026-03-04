# HƯỚNG DẪN CÀI ĐẶT MONGODB (WINDOWS)

## Cách 1: Cài đặt MongoDB Community Edition (Khuyến nghị)

### Bước 1: Download MongoDB

1. Truy cập: https://www.mongodb.com/try/download/community
2. Chọn:
   - Version: Latest (7.0 hoặc mới nhất)
   - Platform: Windows
   - Package: MSI
3. Click **Download**

### Bước 2: Cài đặt

1. Chạy file `.msi` vừa download
2. Chọn **Complete** installation
3. **Service Configuration:**
   - ✅ Install MongoDB as a Service
   - ✅ Run service as Network Service user
   - Service Name: `MongoDB`
4. **Install MongoDB Compass** (GUI tool - khuyến nghị cài)
5. Click **Install**

### Bước 3: Kiểm tra cài đặt

Mở PowerShell và chạy:

```powershell
# Kiểm tra version
mongod --version

# Hoặc kiểm tra service
Get-Service MongoDB
```

Nếu thấy lỗi "mongod is not recognized":

#### Thêm MongoDB vào PATH:

1. Tìm thư mục cài đặt MongoDB (thường là):
   ```
   C:\Program Files\MongoDB\Server\7.0\bin
   ```

2. Thêm vào Environment Variables:
   - Windows Key + Pause → Advanced system settings
   - Environment Variables
   - System Variables → Path → Edit
   - New → Paste đường dẫn: `C:\Program Files\MongoDB\Server\7.0\bin`
   - OK → OK → OK

3. **Đóng và mở lại PowerShell**

4. Test lại:
   ```powershell
   mongod --version
   ```

### Bước 4: Khởi động MongoDB

MongoDB service sẽ tự động chạy sau khi cài đặt.

Kiểm tra service:
```powershell
# Kiểm tra status
Get-Service MongoDB

# Nếu stopped, khởi động:
Start-Service MongoDB

# Dừng service (nếu cần):
Stop-Service MongoDB
```

### Bước 5: Test kết nối

#### Dùng MongoDB Compass (GUI):
1. Mở MongoDB Compass
2. Connection String: `mongodb://localhost:27017`
3. Click **Connect**

#### Dùng Shell:
```powershell
# Mở MongoDB shell
mongosh

# Test commands
> show dbs
> exit
```

---

## Cách 2: Cài đặt qua Chocolatey (Nhanh hơn)

Nếu đã có Chocolatey:

```powershell
# Chạy PowerShell as Administrator
choco install mongodb -y

# Khởi động service
Start-Service MongoDB
```

---

## Cách 3: Sử dụng MongoDB Atlas (Cloud - Miễn phí)

Nếu không muốn cài đặt local:

### Bước 1: Tạo tài khoản
1. Truy cập: https://www.mongodb.com/cloud/atlas/register
2. Đăng ký miễn phí

### Bước 2: Tạo Cluster
1. Create a deployment → Free Shared (M0)
2. Provider: AWS
3. Region: Chọn gần nhất (Singapore)
4. Cluster Name: course-platform
5. Create

### Bước 3: Setup User & Network
1. **Database Access:**
   - Add user: `admin` / `password123`
   - Role: Read and write to any database

2. **Network Access:**
   - Add IP Address: `0.0.0.0/0` (Allow from anywhere)

### Bước 4: Get Connection String
1. Connect → Drivers
2. Copy Connection String:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

3. Thay `<password>` bằng password thật

4. Cập nhật file `.env`:
   ```env
   MONGODB_URI=mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/course_platform?retryWrites=true&w=majority
   ```

---

## Sau khi cài đặt xong:

### 1. Test kết nối với project:

```bash
# Chạy seeder để tạo dữ liệu mẫu
npm run seed
```

Kết quả mong đợi:
```
✅ MongoDB Connected
🗑️  Clearing old data...
👤 Creating users...
📚 Creating courses...
🎬 Creating videos...
💰 Creating orders...

🎉 DATA IMPORT SUCCESSFUL!
```

### 2. Khởi động server:

```bash
npm run dev
```

Thấy thông báo:
```
✅ MongoDB Connected: localhost
📂 Database: course_platform

╔═══════════════════════════════════════╗
║   Server running on port 5000         ║
╚═══════════════════════════════════════╝
```

### 3. Test API:

Mở browser: http://localhost:5000/api/health

---

## Troubleshooting

### Lỗi: MongoDB service won't start

```powershell
# Xem logs
Get-EventLog -LogName Application -Source MongoDB -Newest 10

# Hoặc check log file:
# C:\Program Files\MongoDB\Server\7.0\log\mongod.log
```

### Lỗi: Connection refused

```powershell
# Kiểm tra port 27017 có bị chiếm không
netstat -ano | findstr :27017

# Nếu có process khác, kill nó:
taskkill /PID <PID_NUMBER> /F

# Restart MongoDB
Restart-Service MongoDB
```

### Lỗi: Data directory not found

```powershell
# Tạo data directory
New-Item -ItemType Directory -Path "C:\data\db" -Force

# Chạy mongod với path cụ thể
mongod --dbpath "C:\data\db"
```

---

## Tools hữu ích

### MongoDB Compass (GUI)
- Download: https://www.mongodb.com/products/compass
- Xem database trực quan
- Query builder
- Import/Export data

### MongoDB Shell (mongosh)
- Download: https://www.mongodb.com/try/download/shell
- Command-line interface
- Scripting

### VS Code Extension
- MongoDB for VS Code
- IntelliSense cho queries
- Xem database trong VS Code

---

## Khuyến nghị cho Development

### Local Development:
✅ Cài MongoDB Community Edition local
- Nhanh hơn
- Không phụ thuộc internet
- Free unlimited

### Production:
✅ Dùng MongoDB Atlas hoặc cloud hosting
- Backup tự động
- Scaling dễ dàng
- Security tốt hơn

---

**Sau khi cài xong, quay lại và chạy:**

```bash
npm run seed
npm run dev
```

**Good luck! 🚀**
