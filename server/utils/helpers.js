/**
 * Format file size to human readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format duration in seconds to HH:MM:SS
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs]
    .map(v => v < 10 ? '0' + v : v)
    .join(':');
};

/**
 * Generate unique filename
 * @param {String} originalName - Original filename
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = originalName.split('.').pop();
  return `${timestamp}-${random}.${ext}`;
};

module.exports = {
  formatFileSize,
  formatDuration,
  generateUniqueFilename
};
