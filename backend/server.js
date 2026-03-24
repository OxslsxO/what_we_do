const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const logger = require('./utils/logger');

// 尝试加载生产环境配置文件
const prodEnvFile = '.env.production';
const devEnvFile = '.env';
const fs = require('fs');

// 检查生产环境配置文件是否存在
let envFile = devEnvFile;
if (fs.existsSync(prodEnvFile)) {
  envFile = prodEnvFile;
  console.log('检测到生产环境配置文件，使用生产环境配置');
} else {
  console.log('未检测到生产环境配置文件，使用开发环境配置');
}

// 加载配置文件
dotenv.config({ path: envFile });
console.log(`加载配置文件：${envFile}`);

// ========== 请求响应中间件 ==========
// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增大 JSON 大小限制
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// ========== 增强的请求日志中间件 ==========
app.use((req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const start = Date.now();
  const startTime = new Date().toISOString();

  // 记录请求开始 - 详细信息
  logger.request('📥 收到请求', {
    requestId,
    timestamp: startTime,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? 'Bearer ***' : undefined,
      'content-length': req.headers['content-length']
    },
    ip: req.ip || req.connection.remoteAddress
  });

  // 保存 requestId 到请求对象
  req.requestId = requestId;

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    const endTime = new Date().toISOString();

    // 记录响应信息
    logger.response('📤 响应完成', {
      requestId,
      timestamp: endTime,
      method: res.req.method,
      url: res.req.originalUrl || res.req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length')
    });
  });

  next();
});

// ========== 数据库连接 ==========
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  family: 4
})
  .then(() => {
    logger.info('✅ 数据库连接成功', {
      uri: process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
    });
    console.log('数据库连接成功');
  })
  .catch(err => {
    logger.error('❌ 数据库连接失败:', {
      error: err.message,
      name: err.name,
      stack: err.stack
    });
    console.error('数据库连接失败:', err);
    logger.warn('服务器将在没有数据库连接的情况下启动');
    console.warn('服务器将在没有数据库连接的情况下启动');
  });

// ========== 路由 ==========
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const postRoutes = require('./routes/post');
const relationRoutes = require('./routes/relation');
const circleRoutes = require('./routes/circle');

// 为路由添加详细的日志包装
app.use('/api/auth', (req, res, next) => {
  logger.debug('🔐 认证模块路由', {
    requestId: req.requestId,
    path: req.path
  });
  next();
}, authRoutes);

app.use('/api/ai', (req, res, next) => {
  logger.debug('🤖 AI 模块路由', {
    requestId: req.requestId,
    path: req.path
  });
  next();
}, aiRoutes);

app.use('/api/post', (req, res, next) => {
  logger.debug('📝 帖子模块路由', {
    requestId: req.requestId,
    path: req.path
  });
  next();
}, postRoutes);

app.use('/api/relation', (req, res, next) => {
  logger.debug('🤝 关系模块路由', {
    requestId: req.requestId,
    path: req.path
  });
  next();
}, relationRoutes);

app.use('/api/circle', (req, res, next) => {
  logger.debug('⭕ 圈子模块路由', {
    requestId: req.requestId,
    path: req.path
  });
  next();
}, circleRoutes);

// ========== 健康检查 ==========
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  logger.http('健康检查', healthData);
  res.json(healthData);
});

// 测试接口
app.get('/test', (req, res) => {
  const testData = {
    message: '测试成功',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };
  logger.http('测试接口', testData);
  res.json(testData);
});

// 环境检查接口
app.get('/check', (req, res) => {
  const checkData = {
    env: process.env.NODE_ENV || 'development',
    server: '本地开发服务器',
    port: process.env.PORT || 3000,
    timestamp: new Date().toLocaleString(),
    requestId: req.requestId
  };
  logger.http('环境检查', checkData);
  res.json(checkData);
});

// ========== 增强的全局错误处理 ==========
app.use((err, req, res, next) => {
  const errorId = `${Date.now()}-error`;
  const timestamp = new Date().toISOString();

  // 安全的错误信息提取
  const errorInfo = err ? (typeof err === 'object' ? {
    message: err.message || 'Unknown error',
    name: err.name || 'UnknownError',
    stack: err.stack,
    code: err.code,
    reason: err.reason,
    status: err.status || err.statusCode
  } : {
    message: String(err),
    name: 'UnknownError'
  }) : {
    message: 'Error object is undefined',
    name: 'UnknownError'
  };

  // 详细错误日志
  logger.error('❌ 全局错误捕获', {
    errorId,
    timestamp,
    requestId: req.requestId,
    ...errorInfo,
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    }
  });

  // 格式化错误响应 - 安全的错误信息提取
  const errorResponse = {
    success: false,
    error: {
      message: errorInfo.message,
      name: errorInfo.name,
      code: errorInfo.code,
      status: errorInfo.status || 500,
      timestamp,
      errorId,
      requestId: req.requestId
    }
  };

  // 开发环境显示堆栈
  if (process.env.NODE_ENV === 'development' && errorInfo.stack) {
    errorResponse.error.stack = errorInfo.stack;
    errorResponse.error.details = errorInfo.stack;
  }

  const status = errorInfo.status || 500;
  res.status(status).json(errorResponse);
});

// ========== 未处理的 Promise rejection ==========
process.on('unhandledRejection', (reason, promise) => {
  const errorInfo = reason ? (typeof reason === 'object' ? {
    message: reason.message || 'Unknown reason',
    stack: reason.stack
  } : {
    message: String(reason)
  }) : {
    message: 'Reason is undefined'
  };

  logger.error('❌ 未处理的 Promise Rejection', {
    timestamp: new Date().toISOString(),
    ...errorInfo
  });
  console.error('Unhandled Rejection at:', promise, 'reason:', errorInfo);
});

// ========== 未捕获的异常 ==========
process.on('uncaughtException', (err) => {
  const errorInfo = err ? (typeof err === 'object' ? {
    message: err.message || 'Unknown error',
    name: err.name || 'UnknownError',
    stack: err.stack,
    code: err.code
  } : {
    message: String(err)
  }) : {
    message: 'Error object is undefined'
  };

  logger.error('❌ 未捕获的异常', {
    timestamp: new Date().toISOString(),
    ...errorInfo
  });
  console.error('Uncaught Exception:', errorInfo);
  // 不退出进程，让服务器继续运行
});

// ========== 优雅关闭 ==========
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');
  mongoose.connection.close()
    .then(() => {
      logger.info('数据库连接已关闭');
      process.exit(0);
    })
    .catch(err => {
      logger.error('关闭数据库连接失败:', err);
      process.exit(1);
    });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号 (Ctrl+C)，正在关闭服务器...');
  mongoose.connection.close()
    .then(() => {
      logger.info('数据库连接已关闭');
      process.exit(0);
    })
    .catch(err => {
      logger.error('关闭数据库连接失败:', err);
      process.exit(1);
    });
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info('🚀 服务器启动成功', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
    testEndpoint: `http://localhost:${PORT}/test`
  });
  console.log(`\n========================================`);
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查：http://localhost:${PORT}/health`);
  console.log(`🧪 测试接口：http://localhost:${PORT}/test`);
  console.log(`📁 日志目录：logs`);
  console.log(`========================================\n`);
});

// 服务器错误处理
server.on('error', (err) => {
  logger.error('❌ 服务器错误', {
    message: err.message,
    code: err.code,
    syscall: err.syscall
  });
  console.error('Server error:', err);
});

// 导出 logger 供其他模块使用
exports.logger = logger;
