import React, { useRef, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

// Bytes per HTTP range request (~7s at 8.9 Mbps — small enough to stay under SB limit)
const FETCH_CHUNK_BYTES  = 8 * 1024 * 1024;   // 8 MB per fetch

// Target: keep this many seconds buffered ahead
const TARGET_AHEAD_SECS  = 60;                // 1 minute ahead

// Start a new fetch when buffered ahead drops below this
const REFETCH_THRESHOLD  = 20;               // refetch if < 20s ahead

// Evict data this far behind the playhead
const EVICT_BEHIND_SECS  = 30;

const VIDEO_CODEC_MAP = {
  'avc1': 'avc1.640028',
  'avc3': 'avc1.640028',
  'hev1': 'hev1.1.6.L93.B0',
  'hvc1': 'hev1.1.6.L93.B0',
  'av01': 'av01.0.08M.08',
  'vp09': 'vp09.00.31.08',
  'vp08': 'vp8',
};
const AUDIO_CODEC_MAP = {
  'mp4a': 'mp4a.40.2',
  'opus': 'opus',
  'flac': 'flac',
  'ac-3': 'ac-3',
  'ec-3': 'ec-3',
};
const CONTAINER_MAP = {
  'vp09': 'video/webm',
  'vp08': 'video/webm',
};

function resolveMime(videoCodec, audioCodec, hasAudio) {
  const vc = (videoCodec || '').toLowerCase();
  const ac = (audioCodec || '').toLowerCase();
  const container = CONTAINER_MAP[vc] || 'video/mp4';
  const vStr = VIDEO_CODEC_MAP[vc];
  const aStr = hasAudio ? AUDIO_CODEC_MAP[ac] : null;
  const candidates = [];
  if (vStr && aStr) candidates.push(`${container}; codecs="${vStr}, ${aStr}"`);
  if (vStr)         candidates.push(`${container}; codecs="${vStr}"`);
  // Generic fallbacks in case the detected codec isn't in the map
  candidates.push('video/mp4; codecs="avc1.640028, mp4a.40.2"');
  candidates.push('video/mp4; codecs="avc1.640028"');
  candidates.push('video/mp4');
  return candidates.find(t => MediaSource.isTypeSupported(t)) || null;
}

function VideoPlayer({ videoId, className }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoId) return;

    const token = localStorage.getItem('token');
    setError(null);
    setLoading(true);

    if (!window.MediaSource) {
      setError('Trình duyệt không hỗ trợ MSE. Vui lòng dùng Chrome/Edge.');
      return;
    }

    // Clear any stale error on the element
    if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      video.removeAttribute('src');
    }

    let sb           = null;
    let totalSize    = 0;
    let duration     = 0;
    let seekTable    = [];  // [{t, b}] keyframe byte offsets from file
    let videoCodec   = null;
    let audioCodec   = null;
    let hasAudio     = false;
    let initBuf      = null;  // cached ftyp+moov from first fetch
    let seekNeedsInit = false; // true after remove(0,Infinity) — must re-send initBuf
    let fetchedEnd   = -1;
    let isFetching   = false;
    let seekTarget   = -1;
    let pendingBuf   = null;  // buffer waiting to be appended after eviction
    let abortCtrl    = null;  // AbortController for the current in-flight fetch
    let fetchGen     = 0;     // incremented on seek — stale buffers are discarded
    let destroyed    = false;
    let ms           = null;
    let blobUrl      = null;

    // ── helpers ───────────────────────────────────────────────────────────────

    function bufferedAhead() {
      if (!sb || !sb.buffered.length) return 0;
      const t = video.currentTime;
      for (let i = 0; i < sb.buffered.length; i++) {
        if (t >= sb.buffered.start(i) && t <= sb.buffered.end(i) + 0.5)
          return sb.buffered.end(i) - t;
      }
      return 0;
    }

    function isTimeBuffered(t) {
      if (!sb) return false;
      for (let i = 0; i < sb.buffered.length; i++) {
        if (t >= sb.buffered.start(i) && t <= sb.buffered.end(i) + 0.5) return true;
      }
      return false;
    }

    function timeToOffset(t) {
      // Use the DB seek table for exact moof-boundary alignment.
      // Binary search: find the largest entry with entry.t <= t.
      if (seekTable.length > 0) {
        let lo = 0, hi = seekTable.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (seekTable[mid].t <= t) lo = mid; else hi = mid - 1;
        }
        return seekTable[lo].b;
      }
      // Fallback if seek table unavailable
      if (!duration || !totalSize) return 0;
      const raw = Math.floor((t / duration) * totalSize);
      return Math.max(0, raw - (raw % FETCH_CHUNK_BYTES));
    }

    // ── fetch ────────────────────────────────────────────────────────────────

    async function fetchFrom(startByte) {
      if (destroyed || isFetching) return;
      if (totalSize > 0 && startByte >= totalSize) {
        if (ms.readyState === 'open') { try { ms.endOfStream(); } catch (_) {} }
        return;
      }

      isFetching = true;
      const myGen = ++fetchGen;
      if (abortCtrl) abortCtrl.abort();
      abortCtrl = new AbortController();
      const endByte = totalSize > 0
        ? Math.min(startByte + FETCH_CHUNK_BYTES - 1, totalSize - 1)
        : startByte + FETCH_CHUNK_BYTES - 1;

      try {
        const res = await fetch(`${API_BASE}/videos/${videoId}/stream`, {
          signal: abortCtrl.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Range: `bytes=${startByte}-${endByte}`,
          },
        });

        if (destroyed || myGen !== fetchGen) return;

        if (res.status === 416) {
          if (ms.readyState === 'open') { try { ms.endOfStream(); } catch (_) {} }
          isFetching = false;
          return;
        }
        if (!res.ok) {
          setError(`Lỗi server: HTTP ${res.status}`);
          isFetching = false;
          return;
        }

        // Capture total size from first response
        if (totalSize === 0) {
          const cr = res.headers.get('Content-Range');
          if (cr) { const m = cr.match(/\/(\d+)$/); if (m) totalSize = parseInt(m[1]); }
        }

        const buf = await res.arrayBuffer();
        if (destroyed || myGen !== fetchGen) return;

        // Cache ftyp+moov ONLY from the very first fetch.
        // Do NOT include sidx: those describe segment offsets from the start
        // of the file. Prepending them before a seek chunk at a totally
        // different file offset confuses Chrome's demuxer.
        if (startByte === 0 && !initBuf && buf.byteLength > 8) {
          const dv = new DataView(buf);
          const ftypSize = dv.getUint32(0);
          if (buf.byteLength >= ftypSize + 8) {
            const moovSize = dv.getUint32(ftypSize);
            const tag = String.fromCharCode(
              dv.getUint8(ftypSize+4), dv.getUint8(ftypSize+5),
              dv.getUint8(ftypSize+6), dv.getUint8(ftypSize+7)
            );
            if (tag === 'moov' && buf.byteLength >= ftypSize + moovSize) {
              initBuf = buf.slice(0, ftypSize + moovSize); // 28 + 1254 = 1282 bytes
            }
          }
        }

        fetchedEnd = startByte + buf.byteLength - 1;

        if (!sb || sb.updating || ms.readyState !== 'open') {
          isFetching = false;
          return;
        }

        // PRIORITY: seek reinit must happen before eviction.
        // When seek fires while sb.updating=true (PATH A), sb.remove(0,Inf) is
        // never called — old buffer data remains. video.currentTime is already at
        // the new seek target, so evictTo would intersect the old data and eviction
        // would fire here BEFORE seekNeedsInit, bypassing the initBuf prepend.
        // The seek chunk would then be queued as a plain pendingBuf and appended
        // as a bare moof to a parser in AWAITING_INIT_SEGMENT → Chrome ignores it.
        // The NEXT continuation chunk (non-moof-boundary) would then (wrongly) get
        // the initBuf prepend → CHUNK_DEMUXER_ERROR_APPEND_FAILED.
        if (seekNeedsInit && initBuf) {
          seekNeedsInit = false;
          pendingBuf = buf;            // queued seek chunk
          sb.appendBuffer(initBuf);    // step 1: re-initialize
          return;                      // step 2: append seekChunk in onUpdateEnd
        }

        // Evict old data before appending to avoid SourceBuffer quota exceeded.
        // sb.remove() is async — store buf in pendingBuf, append in onUpdateEnd.
        const evictTo = video.currentTime - EVICT_BEHIND_SECS;
        if (evictTo > 0 && sb.buffered.length > 0 && sb.buffered.start(0) < evictTo) {
          pendingBuf = buf;
          try { sb.remove(0, evictTo); return; } catch (_) { pendingBuf = null; }
        }

        sb.appendBuffer(buf);
      } catch (err) {
        if (err.name === 'AbortError') { if (myGen === fetchGen) isFetching = false; return; }
        if (!destroyed) setError(`Lỗi mạng: ${err.message}`);
        isFetching = false;
      }
    }

    // ── decide whether to fetch more ─────────────────────────────────────────

    function maybeLoadMore() {
      if (destroyed || !sb || sb.updating || isFetching || !totalSize) return;
      if (fetchedEnd + 1 >= totalSize) return;
      if (bufferedAhead() < REFETCH_THRESHOLD) fetchFrom(fetchedEnd + 1);
    }

    // ── updateend: after each appendBuffer or remove ──────────────────────────

    const onUpdateEnd = () => {
      // If we have a pending buffer after an eviction, append it now
      if (pendingBuf) {
        const buf = pendingBuf;
        pendingBuf = null;
        if (ms.readyState === 'open' && !sb.updating) {
          sb.appendBuffer(buf);
          return;
        }
        isFetching = false;
      } else {
        isFetching = false;
      }

      // MUST run before the loading check: if a seek fires before the first
      // chunk arrives the overlay is still visible. Running the loading block
      // first would call setLoading(false) + video.play() with an empty buffer.
      if (seekTarget >= 0) {
        const target = seekTarget;
        seekTarget = -1;
        seekNeedsInit = true;
        // Reset SourceBuffer parser to AWAITING_INIT_SEGMENT so that Chrome
        // accepts our re-sent ftyp+moov as a fresh initialization segment.
        try { if (!sb.updating) sb.abort(); } catch (_) {}
        fetchedEnd = target - 1;
        fetchFrom(target);
        return;
      }

      if (loading) {
        setLoading(false);
        video.play().catch(() => {});
      }

      maybeLoadMore();
    };

    // ── timeupdate: top-up buffer while playing ───────────────────────────────

    const onTimeUpdate = () => {
      if (!sb || sb.updating || isFetching) return;
      maybeLoadMore();
    };

    // ── seeking: user scrubbed the timeline ──────────────────────────────────

    const onSeeking = () => {
      if (!sb || !totalSize || !duration) return;
      const t = video.currentTime;

      // Already buffered? Nothing to do.
      if (isTimeBuffered(t)) return;

      const target = timeToOffset(t);

      if (sb.updating) {
        // PATH A: appendBuffer in progress — store target, handle in onUpdateEnd.
        // Still cancel the in-flight fetch so we don't append stale data.
        fetchGen++;
        if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
        isFetching = false;
        seekTarget = target;
        return;
      }

      fetchGen++;
      if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
      isFetching = false;
      seekTarget = -1;
      fetchedEnd = target - 1;

      try {
        sb.remove(0, Infinity);
        seekTarget = target;
      } catch (_) {
        seekNeedsInit = true;
        fetchFrom(target);
      }
    };

    // ── sourceopen ────────────────────────────────────────────────────────────

    const onSourceOpen = () => {
      const mime = resolveMime(videoCodec, audioCodec, hasAudio);
      if (!mime) { setError('Codec không được hỗ trợ trong trình duyệt này.'); return; }

      try { sb = ms.addSourceBuffer(mime); }
      catch (e) { setError(`addSourceBuffer: ${e.message}`); return; }

      // Set full duration immediately → browser shows complete timeline bar
      if (duration > 0) {
        try { ms.duration = duration; } catch (_) {}
      }

      sb.mode = 'segments';
      sb.addEventListener('updateend', onUpdateEnd);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('seeking', onSeeking);

      fetchFrom(0);
    };

    // ── wire up ───────────────────────────────────────────────────────────────

    video.addEventListener('error', () => {
      const e = video.error;
      if (!destroyed) setError(`Lỗi phát video (${e?.code}): ${e?.message}`);
    });

    // Fetch video metadata first (duration + size), then start MSE
    fetch(`${API_BASE}/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        if (destroyed) return;
        const meta = json.data;
        if (meta.duration)  duration  = meta.duration;
        if (meta.size || meta.fileSize) totalSize = meta.size || meta.fileSize;
        if (Array.isArray(meta.seekTable) && meta.seekTable.length > 0)
          seekTable = meta.seekTable;
        if (meta.videoCodec) videoCodec = meta.videoCodec;
        if (meta.audioCodec) audioCodec = meta.audioCodec;
        if (meta.hasAudio)   hasAudio   = meta.hasAudio;

        ms      = new MediaSource();
        blobUrl = URL.createObjectURL(ms);
        ms.addEventListener('sourceopen', onSourceOpen);
        video.src = blobUrl;
      })
      .catch(err => {
        if (!destroyed) {
          // Metadata fetch failed — start MSE anyway without duration info
          ms      = new MediaSource();
          blobUrl = URL.createObjectURL(ms);
          ms.addEventListener('sourceopen', onSourceOpen);
          video.src = blobUrl;
        }
      });

    return () => {
      destroyed = true;
      fetchGen++;
      if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
      if (ms) ms.removeEventListener('sourceopen', onSourceOpen);
      if (sb) {
        sb.removeEventListener('updateend', onUpdateEnd);
        try { if (ms && ms.readyState === 'open') ms.removeSourceBuffer(sb); } catch (_) {}
      }
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeking', onSeeking);
      video.removeAttribute('src');
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [videoId]);

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.75)', color: '#f88',
          padding: 20, fontSize: 14, textAlign: 'center', zIndex: 10,
        }}>
          {error}
        </div>
      )}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10,
        }}>
          <div style={{ width: 40, height: 40, border: '4px solid #fff3', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className={className}
        style={{ width: '100%', display: 'block', background: '#000' }}
      />
    </div>
  );
}

export default VideoPlayer;
