const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志文件路径
const logFilePath = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);

// 日志级别
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  HTTP: 'http',
  WARN: 'warn',
  ERROR: 'error',
  REQUEST: 'request',
  RESPONSE: 'response'
};

// 日志颜色
const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  http: '\x1b[33m',  // Yellow
  warn: '\x1b[35m',  // Magenta
  error: '\x1b[31m', // Red
  request: '\x1b[34m', // Blue
  response: '\x1b[32m' // Green
};

// 重置颜色
const RESET = '\x1b[0m';

// 格式化时间
const getTimestamp = () => {
  return new Date().toISOString();
};

// 写入日志到文件
const writeToFile = (message) => {
  fs.appendFile(logFilePath, message + '\n', (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
};

// 基础日志方法
const log = (level, message, data = {}) => {
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  const logData = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
  
  // 控制台输出（带颜色）
  const color = COLORS[level] || RESET;
  console.log(`${color}${logMessage}${logData}${RESET}`);
  
  // 文件输出（无颜色）
  writeToFile(`${logMessage}${logData}`);
};

// 导出日志方法
module.exports = {
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  http: (message, data) => log(LOG_LEVELS.HTTP, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  request: (message, data) => log(LOG_LEVELS.REQUEST, message, data),
  response: (message, data) => log(LOG_LEVELS.RESPONSE, message, data)
};
