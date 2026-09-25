// Date formatting
export const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';

    const {
        format = 'short',
        includeTime = false,
        locale = 'en-US'
    } = options;

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const formatOptions = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        medium: { year: 'numeric', month: 'long', day: 'numeric' },
        long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        relative: null
    };

    if (format === 'relative') {
        return formatRelativeDate(dateObj);
    }

    if (includeTime) {
        formatOptions[format] = {
            ...formatOptions[format],
            hour: '2-digit',
            minute: '2-digit'
        };
    }

    return dateObj.toLocaleDateString(locale, formatOptions[format]);
};

// Time formatting
export const formatTime = (date) => {
    if (!date) return 'N/A';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Time';

    return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

// Date and time formatting
export const formatDateTime = (date) => {
    if (!date) return 'N/A';

    return `${formatDate(date)} ${formatTime(date)}`;
};

// Relative date formatting
export const formatRelativeDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    return `${years} year${years !== 1 ? 's' : ''} ago`;
};

// Duration formatting
export const formatDuration = (duration, unit = 'ms') => {
    if (!duration) return '0ms';

    let milliseconds;
    switch (unit) {
        case 's':
            milliseconds = duration * 1000;
            break;
        case 'm':
            milliseconds = duration * 60 * 1000;
            break;
        case 'h':
            milliseconds = duration * 60 * 60 * 1000;
            break;
        default:
            milliseconds = duration;
    }

    if (milliseconds < 1000) return `${milliseconds}ms`;

    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

// File size formatting
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const size = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, size)).toFixed(1)} ${units[size]}`;
};

// Number formatting
export const formatNumber = (number, options = {}) => {
    if (number === null || number === undefined) return '0';

    const {
        decimals = 0,
        compact = false,
        locale = 'en-US'
    } = options;

    if (compact) {
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(number);
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return '0%';
    return `${(value * 100).toFixed(decimals)}%`;
};

// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(amount);
};

// Truncate string
export const truncateString = (str, maxLength = 100, suffix = '...') => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
};

// Capitalize first letter
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Title case
export const titleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// Slugifyexport const slugify = (str) => {
if (!str) return '';
return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Format classification
export const formatClassification = (classification) => {
    if (!classification) return '';
    return classification.charAt(0).toUpperCase() + classification.slice(1);
};

// Format status
export const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\w\S*/g, capitalize);
};

// Format username
export const formatUsername = (username) => {
    if (!username) return 'Anonymous';
    return username;
};

// Format department
export const formatDepartment = (department) => {
    if (!department) return 'N/A';
    return department.toUpperCase();
};

// Format tags
export const formatTags = (tags) => {
    if (!tags || tags.length === 0) return [];
    return tags.map(tag => tag.toLowerCase().trim());
};

export default {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeDate,
    formatDuration,
    formatFileSize,
    formatNumber,
    formatPercentage,
    formatCurrency,
    truncateString,
    capitalize,
    titleCase,
    slugify,
    formatClassification,
    formatStatus,
    formatUsername,
    formatDepartment,
    formatTags
};