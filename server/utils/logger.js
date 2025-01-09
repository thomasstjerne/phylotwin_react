const env = process.env.NODE_ENV || 'development';

// Only enable detailed logging in development mode
const isDebugMode = env !== 'production';

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
  // Special method for logging file contents
  logFileContents: async (fs, filePath, description) => {
    if (!isDebugMode) return;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      console.log(`\n${description} (${filePath}):`);
      console.log(content);
    } catch (error) {
      console.error(`Error reading ${description}:`, error);
    }
  }
};

module.exports = logger; 