const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = import.meta.env.MODE === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

const formatMessage = (level, ...args) => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}]`, ...args];
};

export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(...formatMessage('DEBUG', ...args));
    }
  },
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.info(...formatMessage('INFO', ...args));
    }
  },
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(...formatMessage('WARN', ...args));
    }
  },
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(...formatMessage('ERROR', ...args));
    }
  }
};

export default logger;
