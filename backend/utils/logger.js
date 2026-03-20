const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 定义彩色格式
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
    request: 7,
    response: 8
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
    request: 'cyan',
    response: 'white'
  }
};

winston.addColors(customLevels.colors);

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建多种格式的 logger
const logger = winston.createLogger({
  level: 'silly', // 设置最低级别，显示所有日志
  levels: customLevels.levels,
  
  // 控制台输出格式
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          
          // 如果有额外数据，格式化输出
          if (Object.keys(meta).length > 0) {
            try {
              // 使用自定义 replacer 函数处理循环引用和特殊对象
              const seen = new WeakSet();
              const replacer = (key, val) => {
                // 防止循环引用
                if (val != null && typeof val === 'object') {
                  if (seen.has(val)) return '[Circular]';
                  seen.add(val);
                  
                  // 安全地处理 Error 对象 - 使用 Object.getOwnPropertyDescriptors
                  if (val instanceof Error || (val.constructor && val.constructor.name === 'Error')) {
                    const errorDesc = Object.getOwnPropertyDescriptors(val);
                    return {
                      name: errorDesc.name ? errorDesc.name.value : 'UnknownError',
                      message: errorDesc.message ? errorDesc.message.value : 'Unknown error',
                      stack: errorDesc.stack ? errorDesc.stack.value : 'No stack trace'
                    };
                  }
                }
                // 处理 undefined 和 function
                if (val === undefined) return '[undefined]';
                if (typeof val === 'function') return '[Function]';
                return val;
              };
              
              const metaStr = JSON.stringify(meta, replacer, 2);
              msg += '\n' + metaStr.split('\n').map(line => '  ' + line).join('\n');
            } catch (e) {
              // 如果 JSON.stringify 仍然失败，使用 toString
              msg += '\n  [Meta logging failed: ' + e.message + ']';
            }
          }
          
          return msg;
        })
      )
    }),
    
    // 错误日志文件
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // 请求日志文件
    new winston.transports.File({ 
      filename: 'logs/request.log', 
      level: 'request',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // 综合日志文件
    new winston.transports.File({ 
      filename: 'logs/combined.log', 
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

module.exports = logger;