# Danh sách chức năng dự kiến phát triển cho hệ thống

## 1. Bài tập và Trắc nghiệm (Quizzes & Assignments) - [Ưu tiên]
- **Tạo đề trắc nghiệm bằng file JSON:** Bên cạnh việc admin/giảng viên tải lên (upload) video bài giảng, hệ thống sẽ có thêm chức năng upload file .json theo một cấu trúc cho trước. Hệ thống tự động phân tích (parse) file JSON này và tạo thành một bài tập trắc nghiệm hiển thị trực tiếp trên giao diện cho học viên làm bài sau khi xem xong video.
- Chấm điểm và hiển thị kết quả ngay sau khi nộp bài.

## 2. Trải nghiệm học tập (Learning Experience)
- **Cải tiến Video Player:** Ghi nhớ thời gian đang xem dở, chống tải lậu video (streaming qua HLS/MPEG-DASH).
- **Theo dõi tiến độ học tập (Progress Tracking):** Hiển thị thang phần trăm (%) hoàn thành khóa học, cho phép đánh dấu hoặc tự động tích "Hoàn thành" với những bài học đã xem xong.
- **Cấp chứng chỉ (Certificates):** Tự động tạo và cấp chứng chỉ (PDF) khi học viên hoàn thành 100% video và đạt điểm thi trắc nghiệm theo yêu cầu.

## 3. Thanh toán & Tài chính (Payments)
- **Tích hợp check thanh toán tự động:** Tích hợp các cổng thanh toán (VNPAY, MoMo, ZaloPay) hoặc API kiểm tra biến động số dư (PayOS, SePay). Khi học viên chuyển khoản đúng mã sinh ra lập tức hệ thống tự động đổi trạng thái đơn hàng sang "Đã duyệt" (Success) và thêm học viên vào khóa học ngay lập tức, tiết kiệm công sức duyệt tay minh chứng.
- **Khuyến mãi (Coupons/Vouchers):** Tạo mã giảm giá để chạy chiến dịch marketing.

## 4. Tương tác & Cộng đồng (Engagement)
- **Đánh giá & Nhận xét (Review & Rating):** Học viên đã mua khóa học mới được đánh giá, chấm sao (1-5) để hiển thị ở trang chi tiết khóa học.
- **Cộng đồng Hỏi - Đáp:** Khu vực bình luận trực tiếp bên dưới mỗi video bài giảng để học viên đặt câu hỏi, giảng viên vào giải đáp.
- **Gửi Email tự động:** Thông báo hóa đơn mua hàng thành công, email chào mừng và email nhắc nhở học viên quay lại học.

## 5. Quản trị & Phân tích (Admin Analytics)
- **Dashboard Thống kê:** Hiển thị biểu đồ báo cáo doanh thu, số suất đăng ký mua khóa học theo tháng/tuần.
- **Quyền Giảng Viên (Instructor Role):** (Nếu dự án mở rộng thành Marketplace) cấp quyền cho các giảng viên tự tải khóa học của mình lên và ăn chia lợi nhuận với nền tảng.
