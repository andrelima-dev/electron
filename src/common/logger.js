// Simple structured logger with level methods.
// Can be swapped later for 'electron-log' or another backend.

const LEVELS = ['debug', 'info', 'warn', 'error'];

function format(scope, level, message, extra) {
  const time = new Date().toISOString();
  const base = `[${time}] [${level.toUpperCase()}]${scope ? ` [${scope}]` : ''} ${message}`;
  if (extra !== undefined) {
    return `${base} | ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`;
  }
  return base;
}

function createLogger(scope = '') {
  const logger = {};
  for (const level of LEVELS) {
    logger[level] = (message, extra) => {
      try {
        const line = format(scope, level, message, extra);
        // Map levels to console functions
        if (level === 'error') console.error(line);
        else if (level === 'warn') console.warn(line);
        else if (level === 'debug') console.debug(line);
        else console.log(line);
      } catch (e) {
        // noop
      }
    };
  }
  return logger;
}

module.exports = {
  createLogger
};
