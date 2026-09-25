/**
 * Format a date/time string for display
 */
export const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = (func, limit = 300) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatTimestamp = (dateString) => formatDateTime(dateString);

export const generateConversationId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const getClassificationColor = (classification) => {
  switch (classification?.toLowerCase()) {
    case 'top-secret': return 'text-red-600 bg-red-100';
    case 'secret': return 'text-orange-600 bg-orange-100';
    case 'confidential': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-green-600 bg-green-100';
  }
};

export const getClassificationIcon = (classification) => {
  switch (classification?.toLowerCase()) {
    case 'top-secret': return 'ShieldExclamationIcon';
    case 'secret': return 'ShieldCheckIcon';
    default: return 'InformationCircleIcon';
  }
};

export default {
  formatTime,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatFileSize,
  formatDuration,
  formatNumber,
  truncateText,
  capitalize,
  slugify,
  debounce,
  throttle,
  formatTimestamp,
  generateConversationId,
  copyToClipboard,
  getClassificationColor,
  getClassificationIcon
};
