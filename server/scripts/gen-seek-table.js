/**
 * Build a keyframe seek table by parsing the fMP4 box structure directly.
 * Stores seekTable: [{t: seconds, b: moofByteOffset}] — exact moof boundaries.
 *
 * ffprobe packet `pos` = sample-data offset (inside mdat) — NOT a moof boundary.
 * Chrome MSE needs appends to start at a moof box, so we parse boxes ourselves.
 *
 * Usage: node scripts/gen-seek-table.js <videoId> <relativeVideoPath>
 * Example:
 *   node scripts/gen-seek-table.js 69ad5707327e601bb2ca6c40 uploads/videos/KiemThu_dash.mp4
 */
require('dotenv').config();
const fs        = require('fs');
const path      = require('path');
const mongoose  = require('mongoose');
const connectDB = require('../config/db');
const Video     = require('../models/Video');

const [, , videoId, relPath] = process.argv;
if (!videoId || !relPath) {
  console.error('Usage: node scripts/gen-seek-table.js <videoId> <relativeVideoPath>');
  process.exit(1);
}

const filePath = path.resolve(__dirname, '..', relPath);

// ─── MP4 box helpers ──────────────────────────────────────────────────────────
const u32 = (buf, off) => buf.readUInt32BE(off);
const t4  = (buf, off) => buf.slice(off, off + 4).toString('ascii');

/** Invoke cb(type, absOffset, size) for every immediate child box in buf[start..end] */
function walkBoxes(buf, start, end, cb) {
  let pos = start;
  while (pos + 8 <= end) {
    const size = u32(buf, pos);
    const type = t4(buf, pos + 4);
    if (size < 8) break;
    cb(type, pos, size);
    pos += size;
  }
}

/**
 * Parse moov box → { videoTrackId, videoTimescale }
 * Looks for trak > hdlr (vide) to find the video track, then reads mdhd.timescale.
 */
function parseMovieMeta(moovBuf) {
  let videoTrackId   = 1;
  let videoTimescale = 30000;

  walkBoxes(moovBuf, 8, moovBuf.length, (type, trakOff, trakSize) => {
    if (type !== 'trak') return;

    let isVideo = false, trackId = 0, timescale = 0;

    walkBoxes(moovBuf, trakOff + 8, trakOff + trakSize, (t2, s2, sz2) => {
      if (t2 === 'tkhd') {
        const v = moovBuf[s2 + 8];
        trackId = v === 1 ? u32(moovBuf, s2 + 28) : u32(moovBuf, s2 + 20);
      }
      if (t2 === 'mdia') {
        walkBoxes(moovBuf, s2 + 8, s2 + sz2, (t3, s3) => {
          if (t3 === 'hdlr') {
            if (t4(moovBuf, s3 + 16) === 'vide') isVideo = true;
          }
          if (t3 === 'mdhd') {
            const v = moovBuf[s3 + 8];
            timescale = v === 1 ? u32(moovBuf, s3 + 28) : u32(moovBuf, s3 + 20);
          }
        });
      }
    });

    if (isVideo && timescale > 0) {
      videoTrackId   = trackId;
      videoTimescale = timescale;
    }
  });

  return { videoTrackId, videoTimescale };
}

/**
 * Parse a moof buffer and return the video track's decode time, or null.
 * Works whether the moof has separate video/audio trafs or a combined traf.
 */
function parseMoofVideoDecodeTime(moofBuf, videoTrackId) {
  let decodeTime = null;

  walkBoxes(moofBuf, 8, moofBuf.length, (type, trafOff, trafSize) => {
    if (type !== 'traf' || decodeTime !== null) return;

    let trackId = 0, tfdt = null;

    walkBoxes(moofBuf, trafOff + 8, trafOff + trafSize, (t2, s2) => {
      if (t2 === 'tfhd') {
        // FullBox: size(4)+type(4)+version(1)+flags(3) = 12 bytes before track_id
        trackId = u32(moofBuf, s2 + 12);
      }
      if (t2 === 'tfdt' && tfdt === null) {
        const v = moofBuf[s2 + 8];
        if (v === 1) {
          // 64-bit decode time
          tfdt = u32(moofBuf, s2 + 12) * 4294967296 + u32(moofBuf, s2 + 16);
        } else {
          tfdt = u32(moofBuf, s2 + 12);
        }
      }
    });

    if (trackId === videoTrackId && tfdt !== null) decodeTime = tfdt;
  });

  return decodeTime;
}

/**
 * Walk the entire file box-by-box.
 * Returns [{t: seconds, b: moofByteOffset}] — exact moof boundaries.
 */
function buildSeekTable(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const { size: fileSize } = fs.fstatSync(fd);
  const hdr = Buffer.alloc(8);

  let videoTrackId   = 1;
  let videoTimescale = 30000;
  let fileOffset     = 0;
  const table        = [];

  while (fileOffset + 8 <= fileSize) {
    if (fs.readSync(fd, hdr, 0, 8, fileOffset) < 8) break;
    const boxSize = u32(hdr, 0);
    const boxType = t4(hdr, 4);
    if (boxSize < 8) break;

    if (boxType === 'moov') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      ({ videoTrackId, videoTimescale } = parseMovieMeta(buf));
      console.log(`  moov parsed: videoTrackId=${videoTrackId}, timescale=${videoTimescale}`);
    } else if (boxType === 'moof') {
      const buf = Buffer.alloc(boxSize);
      fs.readSync(fd, buf, 0, boxSize, fileOffset);
      const dt = parseMoofVideoDecodeTime(buf, videoTrackId);
      if (dt !== null) {
        table.push({ t: parseFloat((dt / videoTimescale).toFixed(6)), b: fileOffset });
      }
    }
    // All other boxes (ftyp, sidx, mdat, …): just advance the offset

    fileOffset += boxSize;
  }

  fs.closeSync(fd);
  return table;
}

(async () => {
  try {
    await connectDB();

    console.log(`Parsing box structure: ${filePath}`);
    const seekTable = buildSeekTable(filePath);

    if (seekTable.length === 0) {
      console.error('No video moof boxes found — is this a fragmented MP4?');
      process.exit(1);
    }

    console.log(`Found ${seekTable.length} video fragments`);
    console.log(`First: t=${seekTable[0].t}s  b=${seekTable[0].b}`);
    console.log(`Last:  t=${seekTable[seekTable.length-1].t}s  b=${seekTable[seekTable.length-1].b}`);

    const updated = await Video.findByIdAndUpdate(
      videoId,
      { $set: { seekTable, videoUrl: '/' + relPath.replace(/\\/g, '/') } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      console.error(`Video ${videoId} not found in DB`);
      process.exit(1);
    }

    console.log(`\nUpdated: "${updated.title}"`);
    console.log(`videoUrl: ${updated.videoUrl}`);
    console.log(`seekTable entries: ${updated.seekTable.length}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
