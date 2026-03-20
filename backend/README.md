# 今天干点啥 - 后端服务日志系统说明

## 📋 目录
- [快速启动](#快速启动)
- [查看日志](#查看日志)
- [日志级别](#日志级别)
- [日志示例](#日志示例)
- [故障排查](#故障排查)

---

## 🚀 快速启动

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 配置环境变量
确保 `backend/.env` 文件存在并包含必要配置：
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/what_we_do
JWT_SECRET=your_jwt_secret_key
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your_bucket_name
COS_REGION=ap-guangzhou
COS_DOMAIN=https://your-bucket.cos.ap-guangzhou.myqcloud.com
SERVER_URL=http://localhost:3001
```

### 3. 启动服务
```bash
# 方式一：使用 npm
npm start

# 方式二：直接运行 node
node server.js

# 方式三：Windows 批处理
start-prod.bat
```

### 4. 验证启动成功
看到以下输出表示启动成功：
```
========================================
🚀 服务器运行在 http://localhost:3001
📊 健康检查：http://localhost:3001/health
🧪 测试接口：http://localhost:3001/test
📁 日志目录：c:\...\backend\logs
========================================
```

---

## 📊 查看日志

### 实时日志（推荐）
启动后，所有日志会**自动显示在终端**，采用彩色输出：

```
2026-03-19 19:05:19.123 [info]: ✅ 数据库连接成功
  {
    "uri": "mongodb://***:***@localhost:27017/what_we_do"
  }

2026-03-19 19:05:20.456 [request]: 📥 收到请求
  {
    "requestId": "1710849920456-abc123def",
    "timestamp": "2026-03-19T11:05:20.456Z",
    "method": "POST",
    "url": "/api/auth/login",
    "body": {
      "phone": "138****8000",
      "password": "******"
    }
  }

2026-03-19 19:05:20.789 [info]: 🔑 登录请求
  {
    "phone": "138****8000",
    "hasPassword": true
  }

2026-03-19 19:05:20.890 [info]: ✅ 登录成功
  {
    "phone": "138****8000",
    "userId": "600000000000000000000000",
    "tokenGenerated": true,
    "duration": "101ms"
  }

2026-03-19 19:05:20.891 [response]: 📤 响应完成
  {
    "requestId": "1710849920456-abc123def",
    "statusCode": 200,
    "duration": "435ms"
  }
```

### 日志文件
日志同时会保存到 `backend/logs/` 目录：

| 文件名 | 说明 | 级别 | 大小限制 |
|--------|------|------|----------|
| `error.log` | 仅记录错误 | error | 10MB (保留 5 个) |
| `request.log` | 所有请求详情 | request | 10MB (保留 5 个) |
| `combined.log` | 综合日志 | info+ | 10MB (保留 5 个) |

### 查看日志文件
```bash
# Windows PowerShell
Get-Content backend\logs\combined.log -Tail 100 -Wait

# 或使用文本编辑器打开
notepad backend\logs\combined.log
```

---

## 🎨 日志级别与颜色

| 级别 | 颜色 | 图标 | 说明 |
|------|------|------|------|
| `error` | 红色 | ❌ | 错误信息 |
| `warn` | 黄色 | ⚠️ | 警告信息 |
| `info` | 绿色 | ✅ | 一般信息 |
| `http` | 紫色 | 🔐 | HTTP 相关 |
| `verbose` | 青色 | ℹ️ | 详细信息 |
| `debug` | 蓝色 | 🔍 | 调试信息 |
| `silly` | 灰色 | - | 最详细信息 |
| `request` | 青色 | 📥 | 请求日志 |
| `response` | 白色 | 📤 | 响应日志 |

---

## 📝 日志示例

### 1. 认证模块日志
```
2026-03-19 19:05:20.123 [info]: 📝 注册请求
  {
    "phone": "138****8000",
    "hasPassword": true,
    "passwordLength": 8
  }

2026-03-19 19:05:20.456 [info]: ✅ 注册成功
  {
    "phone": "138****8000",
    "userId": "600000000000000000000000",
    "duration": "333ms"
  }
```

### 2. 帖子模块日志
```
2026-03-19 19:06:30.789 [info]: 📝 创建帖子请求
  {
    "contentTypeLength": 120,
    "fileCount": 3,
    "tagsCount": 2,
    "playType": "eat"
  }

2026-03-19 19:06:31.234 [info]: ✅ 图片上传 COS 成功
  {
    "count": 3
  }

2026-03-19 19:06:31.567 [info]: ✅ 帖子创建成功
  {
    "postId": "600000000000000000000001",
    "imageCount": 3,
    "tagCount": 2,
    "duration": "778ms"
  }
```

### 3. 错误日志
```
2026-03-19 19:07:45.890 [error]: ❌ 全局错误捕获
  {
    "errorId": "1710850065890-error",
    "timestamp": "2026-03-19T11:07:45.890Z",
    "message": "User not found",
    "name": "NotFoundError",
    "stack": "Error: User not found\n    at ..."
  }
```

---

## 🐛 故障排查

### 问题 1：看不到日志
**解决方案**：
1. 确认服务器已启动
2. 检查终端是否被最小化
3. 查看日志文件：`backend/logs/combined.log`

### 问题 2：日志太多看不清
**解决方案**：
1. 使用过滤命令查看特定级别日志
```bash
# 仅查看错误
Get-Content backend\logs\error.log -Tail 50

# 仅查看某个接口的日志
Select-String -Path backend\logs\request.log -Pattern "/api/auth/login"
```

### 问题 3：数据库连接失败
**查看日志**：
```
❌ 数据库连接失败
  {
    "error": "connect ECONNREFUSED 127.0.0.1:27017",
    "name": "MongoServerSelectionError"
  }
```
**解决方案**：
1. 启动 MongoDB 服务
2. 检查 `.env` 中的 `MONGODB_URI` 配置

### 问题 4：端口被占用
**查看日志**：
```
❌ 服务器错误
  {
    "code": "EADDRINUSE",
    "message": "Port 3001 is already in use"
  }
```
**解决方案**：
1. 关闭占用端口的进程
2. 或修改 `.env` 中的 `PORT` 配置

---

## 🔧 高级用法

### 1. 只查看特定级别的日志
修改 `server.js` 中的 logger 配置：
```javascript
const logger = winston.createLogger({
  level: 'error', // 只显示 error 及以上级别
  // ... other config
});
```

### 2. 添加自定义日志
在你的代码中导入 logger：
```javascript
const { logger } = require('../server');

// 使用示例
logger.info('我的自定义日志', { data: 'test' });
```

### 3. 性能监控
每个接口都会输出执行时间：
```
✅ 获取用户信息成功
  {
    "userId": "600000000000000000000000",
    "duration": "45ms"  // 执行时间
  }
```

---

## 📞 技术支持

如有问题，请查看：
1. 错误日志：`backend/logs/error.log`
2. 请求日志：`backend/logs/request.log`
3. 综合日志：`backend/logs/combined.log`

---

**最后更新**: 2026-03-19
**版本**: v1.0.0
