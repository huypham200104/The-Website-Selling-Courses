# Hướng Dẫn Video Upload & FFmpeg Processing

## 🎬 Cách Video Được Xử Lý

Khi instructor upload video, hệ thống tự động:

### 1. **Upload Chunks** (5MB mỗi chunk)
```
Video gốc → Chia nhỏ → Upload từng chunk → Server nhận
```

### 2. **Merge Chunks**
```
Chunk 1 + Chunk 2 + ... + Chunk N → Merged file
```

### 3. **FFmpeg Processing** 🔧
```javascript
Input: Bất kỳ format nào (MP4, AVI, MKV, MOV, WebM, FLV...)
  ↓
FFmpeg với options:
  -movflags frag_keyframe+empty_moov+default_base_moof  // Fragmented MP4
  -c:v libx264 -preset fast -crf 23                     // H.264 video
  -c:a aac -b:a 128k                                    // AAC audio
  -pix_fmt yuv420p                                      // Pixel format
  ↓
Output: Fragmented MP4 (web_timestamp_filename.mp4)
```

### 4. **Kết Quả**
- ✅ Tương thích MSE (Media Source Extensions)
- ✅ Streaming chunk-by-chunk cho student
- ✅ Chống download (không có URL trực tiếp)
- ✅ Compatible với mọi browser hiện đại

---

## 🧪 Test FFmpeg

Để test xem FFmpeg hoạt động đúng không:

```bash
cd server
node test-ffmpeg.js path/to/your/video.mp4
```

Output sẽ hiển thị:
- ✅ Conversion progress
- ✅ Output codec (phải là h264 + aac)
- ✅ File size và duration

---

## 📊 Format Được Hỗ Trợ

**Input:** MỌI format video phổ biến
- ✅ MP4, M4V
- ✅ AVI
- ✅ MKV
- ✅ MOV
- ✅ WebM
- ✅ FLV
- ✅ WMV
- ✅ MPEG

**Output:** Luôn luôn Fragmented MP4 (H.264/AAC)

---

## ⚠️ Troubleshooting

### Lỗi: "Video stream codec av1 doesn't match SourceBuffer codecs"

**Nguyên nhân:** Video cũ (upload trước khi cập nhật code) vẫn có codec AV1/HEVC

**Giải pháp:**
1. Khởi động lại server
2. Xóa video bị lỗi (instructor interface)
3. Upload lại video → Tự động convert sang H.264

### Lỗi: "FFMPEG not found"

**Nguyên nhân:** Package ffmpeg-static chưa được cài đặt

**Giải pháp:**
```bash
cd server
npm install ffmpeg-static fluent-ffmpeg
```

### Video xử lý lâu

**Bình thường:**
- Video 5 phút: ~30-60 giây
- Video 30 phút: ~2-4 phút
- Video 2 giờ: ~8-15 phút

**Nếu quá lâu:**
- Kiểm tra CPU server
- Có thể thay `-preset fast` → `-preset ultrafast` (chất lượng giảm)

### Video không hiển thị cho student

**Checklist:**
1. ✅ Server đã restart sau khi update code?
2. ✅ Video đã được upload HOÀN TOÀN (100%)?
3. ✅ Kiểm tra server logs: `[FFMPEG] ✅ Video converted...`
4. ✅ Student đã enrolled vào course?
5. ✅ Browser hỗ trợ MSE? (Chrome, Edge, Firefox, Safari mới)

---

## 🔍 Debug Commands

### Kiểm tra video codec:
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 video.mp4
```

Expected output: `h264`

### Kiểm tra có fragmented không:
```bash
ffprobe -show_format video.mp4 | grep -i moov
```

Nếu là fragmented MP4, sẽ không thấy `moov` atom ở cuối file.

---

## 📈 Performance Tuning

### Tăng tốc processing (giảm chất lượng):
```javascript
'-preset ultrafast',  // Thay vì 'fast'
'-crf 28',           // Thay vì '23' (cao hơn = chất lượng thấp hơn)
```

### Tăng chất lượng (chậm hơn):
```javascript
'-preset slow',      // Thay vì 'fast'
'-crf 18',          // Thay vì '23' (thấp hơn = chất lượng cao hơn)
```

### Giảm dung lượng:
```javascript
'-b:v 2000k',       // Bitrate video 2Mbps
'-maxrate 2500k',   // Max bitrate
'-bufsize 5000k',   // Buffer size
```

---

## ✅ Verification

Sau khi upload video, kiểm tra server logs:

```
[MERGE] Processing video with FFmpeg...
[MERGE] Input file: video.mp4
[FFMPEG] Re-encoding to fragmented MP4 (H.264/AAC) for MSE compatibility
[FFMPEG] Command: ffmpeg -i ... -movflags frag_keyframe+empty_moov+default_base_moof ...
[FFMPEG] Processing: 25.5%
[FFMPEG] Processing: 50.2%
[FFMPEG] Processing: 75.8%
[FFMPEG] Processing: 100.0%
[FFMPEG] ✅ Video converted to fragmented MP4 successfully
```

Nếu thấy `✅ Video converted...` → Thành công!
