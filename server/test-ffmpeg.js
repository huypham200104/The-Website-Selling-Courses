// Test FFmpeg fragmented MP4 conversion
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

console.log('🔧 Testing FFmpeg Fragmented MP4 Conversion...\n');
console.log('FFmpeg path:', ffmpegPath);
console.log('');

// Test với một video sample (nếu có)
const testVideoPath = process.argv[2];

if (!testVideoPath) {
  console.log('❌ Vui lòng cung cấp đường dẫn video để test:');
  console.log('   node test-ffmpeg.js path/to/video.mp4\n');
  console.log('📋 FFmpeg Options cho Fragmented MP4:');
  console.log('   -movflags frag_keyframe+empty_moov+default_base_moof');
  console.log('   -c:v libx264 -preset fast -crf 23');
  console.log('   -c:a aac -b:a 128k');
  console.log('   -pix_fmt yuv420p\n');
  process.exit(1);
}

const outputPath = path.join(
  path.dirname(testVideoPath),
  `fragmented_${Date.now()}_${path.basename(testVideoPath)}`
);

console.log('📥 Input:', testVideoPath);
console.log('📤 Output:', outputPath);
console.log('');

ffmpeg(testVideoPath)
  .outputOptions([
    '-movflags frag_keyframe+empty_moov+default_base_moof',
    '-c:v libx264',
    '-preset fast',
    '-crf 23',
    '-c:a aac',
    '-b:a 128k',
    '-pix_fmt yuv420p'
  ])
  .output(outputPath)
  .on('start', (cmd) => {
    console.log('🚀 FFmpeg started:');
    console.log(cmd);
    console.log('');
  })
  .on('progress', (progress) => {
    if (progress.percent) {
      process.stdout.write(`\r⏳ Processing: ${progress.percent.toFixed(1)}%`);
    }
  })
  .on('end', () => {
    console.log('\n\n✅ Conversion completed successfully!');
    console.log('📁 Output file:', outputPath);
    console.log('');
    
    // Verify output is fragmented MP4
    ffmpeg.ffprobe(outputPath, (err, metadata) => {
      if (err) {
        console.error('❌ Error checking output:', err.message);
        return;
      }
      
      console.log('📊 Output Info:');
      console.log('   Format:', metadata.format.format_name);
      console.log('   Duration:', metadata.format.duration + 's');
      console.log('   Size:', (metadata.format.size / 1024 / 1024).toFixed(2) + ' MB');
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      if (videoStream) {
        console.log('   Video Codec:', videoStream.codec_name);
        console.log('   Resolution:', videoStream.width + 'x' + videoStream.height);
      }
      
      if (audioStream) {
        console.log('   Audio Codec:', audioStream.codec_name);
      }
      
      console.log('\n✨ Video is ready for MSE streaming!');
    });
  })
  .on('error', (err) => {
    console.error('\n\n❌ Conversion failed:', err.message);
    process.exit(1);
  })
  .run();
