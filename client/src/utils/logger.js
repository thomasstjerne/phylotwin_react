// Only enable detailed logging in development mode
const isDebugMode = process.env.NODE_ENV !== 'production';

const logger = {
  group: (...args) => {
    if (isDebugMode) {
      console.group(...args);
    }
  },
  groupEnd: () => {
    if (isDebugMode) {
      console.groupEnd();
    }
  },
  log: (...args) => {
    if (isDebugMode) {
      console.log(...args);
    }
  },
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  warn: (...args) => {
    // Always log warnings, even in production
    console.warn(...args);
  },
  debug: (...args) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  // Special method for logging form data
  logFormData: (formData) => {
    if (!isDebugMode) return;
    
    console.log('FormData contents:');
    for (let pair of formData.entries()) {
      if (pair[0] === 'polygon') {
        console.log('polygon file:', pair[1].name, 'size:', pair[1].size, 'bytes');
      } else {
        console.log(pair[0], ':', pair[1]);
      }
    }
  }
};

export default logger; 