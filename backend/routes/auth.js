const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const multer = require('multer');

// 导入统一的 logger
const logger = require('../utils/logger');

// 配置 multer，使用内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

dotenv.config();

// 验证码存储（实际项目中建议使用Redis）
const codeStore = new Map();

// 防暴力破解：记录请求次数
const requestLimit = new Map();
const MAX_REQUESTS = 5; // 每分钟最大请求数
const REQUEST_WINDOW = 60000; // 请求窗口（毫秒）

// ========== 发送验证码接口 ==========
router.post('/send-code', (req, res) => {
  const startTime = Date.now();
  const { phone } = req.body;
  
  logger.info('📱 发送验证码请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty'
  });
  
  try {
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      logger.warn('⚠️ 发送验证码失败 - 手机号格式错误', { phone });
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    
    // 防暴力破解：检查请求次数
    const now = Date.now();
    const key = `send-code:${phone}`;
    const requests = requestLimit.get(key) || [];
    
    // 过滤掉过期的请求
    const validRequests = requests.filter(timestamp => now - timestamp < REQUEST_WINDOW);
    
    if (validRequests.length >= MAX_REQUESTS) {
      logger.warn('⚠️ 发送验证码失败 - 请求过于频繁', { phone });
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 存储验证码（有效期5分钟）
    codeStore.set(phone, {
      code,
      expiresAt: now + 5 * 60 * 1000
    });
    
    // 更新请求次数
    validRequests.push(now);
    requestLimit.set(key, validRequests);
    
    // 模拟发送短信（实际项目中需要调用短信服务商API）
    logger.info('✅ 验证码已生成', {
      phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      code: '******', // 不记录真实验证码
      expiresAt: new Date(now + 5 * 60 * 1000).toISOString()
    });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 发送验证码成功', {
      phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      duration: `${duration}ms`
    });
    
    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 发送验证码失败', {
      phone,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ error: '发送验证码失败', details: errorInfo.message });
  }
});

// ========== 注册接口 ==========
router.post('/register', async (req, res) => {
  const startTime = Date.now();
  const { phone, code, password } = req.body;
  
  logger.info('📝 注册请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
    hasPassword: !!password,
    passwordLength: password ? password.length : 0,
    hasCode: !!code
  });
  
  try {
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      logger.warn('⚠️ 注册失败 - 手机号格式错误', { phone });
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    
    // 验证验证码
    if (!code) {
      logger.warn('⚠️ 注册失败 - 缺少验证码', { phone });
      return res.status(400).json({ error: '请输入验证码' });
    }
    
    // 检查验证码
    const now = Date.now();
    const codeData = codeStore.get(phone);
    if (!codeData || codeData.expiresAt < now) {
      logger.warn('⚠️ 注册失败 - 验证码已过期', { phone });
      return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }
    if (codeData.code !== code) {
      logger.warn('⚠️ 注册失败 - 验证码错误', { phone });
      return res.status(400).json({ error: '验证码错误' });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      logger.warn('⚠️ 注册失败 - 账号已存在', { phone });
      return res.status(400).json({ error: '账号已注册' });
    }
    
    // 验证密码强度
    if (!password || password.length < 6 || password.length > 20) {
      logger.warn('⚠️ 注册失败 - 密码格式错误', { phone });
      return res.status(400).json({ error: '密码长度应在6-20位之间' });
    }
    
    // 创建新用户
    const newUser = new User({
      phone,
      password,
      userInfo: {
        avatar: 'https://img.icons8.com/ios-filled/100/000000/user.png',
        name: '新用户',
        desc: '享受生活，探索乐趣',
        gender: '',
        birthday: '',
        region: '',
        hobbies: [],
        activities: 0,
        friends: 0,
        points: 0
      }
    });
    
    await newUser.save();
    const duration = Date.now() - startTime;
    
    // 清除验证码
    codeStore.delete(phone);
    
    logger.info('✅ 注册成功', {
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
      userId: newUser._id,
      duration: `${duration}ms`
    });
    
    res.status(201).json({ success: true, message: '注册成功' });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    // 安全的错误处理
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack,
      code: err.code
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 注册失败', {
      phone,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    if (errorInfo.name === 'MongoNetworkError') {
      res.status(500).json({ error: '数据库连接失败，请检查数据库配置' });
    } else {
      res.status(500).json({ error: '注册失败', details: errorInfo.message });
    }
  }
});

// ========== 账号密码登录接口 ==========
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  const { phone, password } = req.body;
  
  logger.info('🔑 登录请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
    hasPassword: !!password
  });
  
  try {
    // 查找用户
    const user = await User.findOne({ phone });
    if (!user) {
      logger.warn('⚠️ 登录失败 - 账号不存在', { phone });
      return res.status(400).json({ error: '账号不存在' });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('⚠️ 登录失败 - 密码错误', { phone });
      return res.status(400).json({ error: '密码错误' });
    }
    
    // 生成 token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // 确保用户信息有完整的默认值
    const completeUserInfo = {
      avatar: user.userInfo.avatar || 'https://img.icons8.com/ios-filled/100/000000/user.png',
      name: user.userInfo.name || '用户',
      desc: user.userInfo.desc || '享受生活，探索乐趣',
      gender: user.userInfo.gender || '',
      birthday: user.userInfo.birthday || '',
      region: user.userInfo.region || '',
      hobbies: user.userInfo.hobbies || [],
      activities: user.userInfo.activities || 0,
      friends: user.userInfo.friends || 0,
      points: user.userInfo.points || 0
    };
    
    const duration = Date.now() - startTime;
    logger.info('✅ 登录成功', {
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
      userId: user._id,
      tokenGenerated: true,
      duration: `${duration}ms`
    });
    
    res.json({ 
      success: true,
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        userInfo: completeUserInfo
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 登录失败', {
      phone,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    if (errorInfo.name === 'MongoNetworkError') {
      res.status(500).json({ error: '数据库连接失败，请检查数据库配置' });
    } else {
      res.status(500).json({ error: '登录失败', details: errorInfo.message });
    }
  }
});

// ========== 验证码快捷登录接口 ==========
router.post('/login-code', async (req, res) => {
  const startTime = Date.now();
  const { phone, code } = req.body;
  
  logger.info('🔑 验证码登录请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
    hasCode: !!code
  });
  
  try {
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      logger.warn('⚠️ 登录失败 - 手机号格式错误', { phone });
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    
    // 验证验证码
    if (!code) {
      logger.warn('⚠️ 登录失败 - 缺少验证码', { phone });
      return res.status(400).json({ error: '请输入验证码' });
    }
    
    // 检查验证码
    const now = Date.now();
    // 测试模式：如果验证码为123456，跳过验证
    if (code !== '123456') {
      const codeData = codeStore.get(phone);
      if (!codeData || codeData.expiresAt < now) {
        logger.warn('⚠️ 登录失败 - 验证码已过期', { phone });
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
      }
      if (codeData.code !== code) {
        logger.warn('⚠️ 登录失败 - 验证码错误', { phone });
        return res.status(400).json({ error: '验证码错误' });
      }
    }
    
    // 查找用户
    let existingUser = await User.findOne({ phone });
    let user = existingUser;
    
    // 如果用户不存在，自动注册
    if (!user) {
      logger.info('📝 验证码登录 - 用户不存在，自动注册', { phone });
      user = new User({
        phone,
        password: await bcrypt.hash(Math.random().toString(36).substring(2, 10), 10), // 生成随机密码
        userInfo: {
          avatar: 'https://img.icons8.com/ios-filled/100/000000/user.png',
          name: '新用户',
          desc: '享受生活，探索乐趣',
          gender: '',
          birthday: '',
          region: '',
          hobbies: [],
          activities: 0,
          friends: 0,
          points: 0
        }
      });
      await user.save();
      logger.info('✅ 自动注册成功', { phone, userId: user._id });
    }
    
    // 生成 token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // 确保用户信息有完整的默认值
    const completeUserInfo = {
      avatar: user.userInfo.avatar || 'https://img.icons8.com/ios-filled/100/000000/user.png',
      name: user.userInfo.name || '用户',
      desc: user.userInfo.desc || '享受生活，探索乐趣',
      gender: user.userInfo.gender || '',
      birthday: user.userInfo.birthday || '',
      region: user.userInfo.region || '',
      hobbies: user.userInfo.hobbies || [],
      activities: user.userInfo.activities || 0,
      friends: user.userInfo.friends || 0,
      points: user.userInfo.points || 0
    };
    
    // 清除验证码
    codeStore.delete(phone);
    
    const duration = Date.now() - startTime;
    logger.info('✅ 验证码登录成功', {
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
      userId: user._id,
      tokenGenerated: true,
      duration: `${duration}ms`
    });
    
    // 检查是否是新注册的用户
    const isNewUser = !existingUser;
    
    res.json({ 
      success: true,
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        userInfo: completeUserInfo
      },
      isNewUser: isNewUser
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 验证码登录失败', {
      phone,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    if (errorInfo.name === 'MongoNetworkError') {
      res.status(500).json({ error: '数据库连接失败，请检查数据库配置' });
    } else {
      res.status(500).json({ error: '登录失败', details: errorInfo.message });
    }
  }
});

// ========== 获取用户信息 ==========
router.get('/user/:userId', async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  
  logger.info('👤 获取用户信息请求', { userId });
  
  try {
    if (!userId) {
      logger.warn('⚠️ 获取用户信息失败 - 缺少用户 ID');
      return res.status(400).json({ error: '缺少用户 ID' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('⚠️ 获取用户信息失败 - 用户不存在', { userId });
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 确保用户信息有完整的默认值
    const completeUserInfo = {
      avatar: user.userInfo.avatar || 'https://img.icons8.com/ios-filled/100/000000/user.png',
      name: user.userInfo.name || '用户',
      desc: user.userInfo.desc || '享受生活，探索乐趣',
      gender: user.userInfo.gender || '',
      birthday: user.userInfo.birthday || '',
      region: user.userInfo.region || '',
      hobbies: user.userInfo.hobbies || [],
      activities: user.userInfo.activities || 0,
      friends: user.userInfo.friends || 0,
      points: user.userInfo.points || 0
    };
    
    const duration = Date.now() - startTime;
    logger.info('✅ 获取用户信息成功', {
      userId,
      userName: user.userInfo.name,
      duration: `${duration}ms`
    });
    
    res.json({ 
      success: true,
      user: {
        _id: user._id,
        phone: user.phone,
        userInfo: completeUserInfo
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 获取用户信息失败', {
      userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ error: '获取失败', details: errorInfo.message });
  }
});

// ========== 检查昵称唯一性 ==========
router.post('/check-name', async (req, res) => {
  const startTime = Date.now();
  const { name } = req.body;
  
  logger.info('🔍 检查昵称唯一性请求', { name });
  
  try {
    if (!name || !name.trim()) {
      logger.warn('⚠️ 检查昵称唯一性失败 - 缺少昵称');
      return res.status(400).json({ error: '请输入昵称' });
    }
    
    // 查找是否有相同昵称的用户
    const existingUser = await User.findOne({ 'userInfo.name': name });
    const isUnique = !existingUser;
    
    const duration = Date.now() - startTime;
    logger.info('✅ 检查昵称唯一性成功', {
      name,
      isUnique,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, isUnique });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 检查昵称唯一性失败', {
      name,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ error: '检查失败', details: errorInfo.message });
  }
});

// ========== 更新用户信息 ==========
router.put('/update-profile', async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.body;
  const userInfo = req.body.userInfo;
  
  logger.info('✏️ 更新用户信息请求', {
    userId,
    updateFields: userInfo ? Object.keys(userInfo) : []
  });
  
  try {
    if (!userId) {
      logger.warn('⚠️ 更新用户信息失败 - 缺少用户 ID');
      return res.status(400).json({ error: '缺少用户 ID' });
    }
    
    // 先查找用户
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('⚠️ 更新用户信息失败 - 用户不存在', { userId });
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 检查昵称唯一性
    if (userInfo.name) {
      const existingUser = await User.findOne({ 'userInfo.name': userInfo.name, _id: { $ne: userId } });
      if (existingUser) {
        logger.warn('⚠️ 更新用户信息失败 - 昵称已被使用', { name: userInfo.name });
        return res.status(400).json({ error: '昵称已被使用' });
      }
    }
    
    // 合并用户信息，确保保留原有字段
    for (const key in userInfo) {
      if (userInfo.hasOwnProperty(key)) {
        user.userInfo[key] = userInfo[key];
      }
    }
    
    console.log('合并后的用户信息:', user.userInfo);
    
    // 更新用户信息
    const updatedUser = await user.save();
    
    console.log('保存后的用户:', updatedUser);
    
    // 确保用户信息有完整的默认值
    const completeUserInfo = {
      avatar: updatedUser.userInfo.avatar || 'https://img.icons8.com/ios-filled/100/000000/user.png',
      name: updatedUser.userInfo.name || '用户',
      desc: updatedUser.userInfo.desc || '享受生活，探索乐趣',
      gender: updatedUser.userInfo.gender || '',
      birthday: updatedUser.userInfo.birthday || '',
      region: updatedUser.userInfo.region || '',
      hobbies: updatedUser.userInfo.hobbies || [],
      activities: updatedUser.userInfo.activities || 0,
      friends: updatedUser.userInfo.friends || 0,
      points: updatedUser.userInfo.points || 0
    };
    
    const duration = Date.now() - startTime;
    logger.info('✅ 更新用户信息成功', {
      userId,
      updatedFields: Object.keys(userInfo),
      duration: `${duration}ms`
    });
    
    res.json({ 
      success: true,
      user: {
        _id: updatedUser._id,
        phone: updatedUser.phone,
        userInfo: completeUserInfo
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 更新用户信息失败', {
      userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ error: '更新失败', details: errorInfo.message });
  }
});

// ========== 密码重置接口 ==========
router.post('/reset-password', async (req, res) => {
  const startTime = Date.now();
  const { phone, code, newPassword } = req.body;
  
  logger.info('🔒 密码重置请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
    hasCode: !!code,
    hasNewPassword: !!newPassword,
    newPasswordLength: newPassword ? newPassword.length : 0
  });
  
  try {
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      logger.warn('⚠️ 密码重置失败 - 手机号格式错误', { phone });
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    
    // 验证验证码
    if (!code) {
      logger.warn('⚠️ 密码重置失败 - 缺少验证码', { phone });
      return res.status(400).json({ error: '请输入验证码' });
    }
    
    // 验证新密码
    if (!newPassword || newPassword.length < 6 || newPassword.length > 20) {
      logger.warn('⚠️ 密码重置失败 - 密码格式错误', { phone });
      return res.status(400).json({ error: '密码长度应在6-20位之间' });
    }
    
    // 检查验证码
    const now = Date.now();
    const codeData = codeStore.get(phone);
    if (!codeData || codeData.expiresAt < now) {
      logger.warn('⚠️ 密码重置失败 - 验证码已过期', { phone });
      return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }
    if (codeData.code !== code) {
      logger.warn('⚠️ 密码重置失败 - 验证码错误', { phone });
      return res.status(400).json({ error: '验证码错误' });
    }
    
    // 查找用户
    const user = await User.findOne({ phone });
    if (!user) {
      logger.warn('⚠️ 密码重置失败 - 账号不存在', { phone });
      return res.status(400).json({ error: '账号不存在' });
    }
    
    // 更新密码
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    // 清除验证码
    codeStore.delete(phone);
    
    const duration = Date.now() - startTime;
    logger.info('✅ 密码重置成功', {
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
      userId: user._id,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, message: '密码重置成功' });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 密码重置失败', {
      phone,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    if (errorInfo.name === 'MongoNetworkError') {
      res.status(500).json({ error: '数据库连接失败，请检查数据库配置' });
    } else {
      res.status(500).json({ error: '密码重置失败', details: errorInfo.message });
    }
  }
});

// ========== 第三方登录接口（微信登录） ==========
router.post('/wechat-login', async (req, res) => {
  const startTime = Date.now();
  const { code: wechatCode } = req.body;
  
  logger.info('💬 微信登录请求', {
    hasWechatCode: !!wechatCode
  });
  
  try {
    // 验证微信code
    if (!wechatCode) {
      logger.warn('⚠️ 微信登录失败 - 缺少微信code');
      return res.status(400).json({ error: '缺少微信code' });
    }
    
    // 模拟微信登录（实际项目中需要调用微信 API）
    // 这里模拟获取微信用户信息
    const mockWechatUser = {
      openid: `wx_${Math.random().toString(36).substring(2, 15)}`,
      nickname: '微信用户',
      avatarUrl: 'https://img.icons8.com/ios-filled/100/000000/user.png'
    };
    
    // 查找用户（通过openid）
    let user = await User.findOne({ 'userInfo.wechatOpenid': mockWechatUser.openid });
    
    // 如果用户不存在，自动注册
    if (!user) {
      logger.info('📝 微信登录 - 用户不存在，自动注册', { openid: mockWechatUser.openid });
      user = new User({
        phone: '', // 微信登录暂时不需要手机号
        password: await bcrypt.hash(Math.random().toString(36).substring(2, 10), 10), // 生成随机密码
        userInfo: {
          avatar: mockWechatUser.avatarUrl,
          name: mockWechatUser.nickname,
          desc: '享受生活，探索乐趣',
          gender: '',
          birthday: '',
          region: '',
          hobbies: [],
          activities: 0,
          friends: 0,
          points: 0,
          wechatOpenid: mockWechatUser.openid
        }
      });
      await user.save();
      logger.info('✅ 微信用户自动注册成功', { openid: mockWechatUser.openid, userId: user._id });
    }
    
    // 生成 token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // 确保用户信息有完整的默认值
    const completeUserInfo = {
      avatar: user.userInfo.avatar || 'https://img.icons8.com/ios-filled/100/000000/user.png',
      name: user.userInfo.name || '用户',
      desc: user.userInfo.desc || '享受生活，探索乐趣',
      gender: user.userInfo.gender || '',
      birthday: user.userInfo.birthday || '',
      region: user.userInfo.region || '',
      hobbies: user.userInfo.hobbies || [],
      activities: user.userInfo.activities || 0,
      friends: user.userInfo.friends || 0,
      points: user.userInfo.points || 0
    };
    
    const duration = Date.now() - startTime;
    logger.info('✅ 微信登录成功', {
      openid: mockWechatUser.openid,
      userId: user._id,
      tokenGenerated: true,
      duration: `${duration}ms`
    });
    
    res.json({ 
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        userInfo: completeUserInfo
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 微信登录失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    if (errorInfo.name === 'MongoNetworkError') {
      res.status(500).json({ error: '数据库连接失败，请检查数据库配置' });
    } else {
      res.status(500).json({ error: '登录失败', details: errorInfo.message });
    }
  }
});

// ========== 头像上传接口 ==========
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  const startTime = Date.now();
  const userId = req.body.userId;
  
  logger.info('🖼️ 头像上传请求', { userId, hasFile: !!req.file });
  
  try {
    if (!userId) {
      logger.warn('⚠️ 头像上传失败 - 缺少用户 ID');
      return res.status(400).json({ error: '缺少用户 ID' });
    }
    
    if (!req.file) {
      logger.warn('⚠️ 头像上传失败 - 缺少文件');
      return res.status(400).json({ error: '缺少文件' });
    }
    
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('⚠️ 头像上传失败 - 用户不存在', { userId });
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 生成唯一的文件名
    const fileName = `avatars/${userId}_${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;
    
    // 模拟上传到云存储，实际项目中需要上传到 COS、OSS 等
    // 这里使用一个基于文件内容的哈希来生成唯一的头像 URL
    const fileHash = require('crypto').createHash('md5').update(req.file.buffer).digest('hex');
    const avatarUrl = `https://neeko-copilot.bytedance.net/api/text2image?prompt=user%20avatar&size=512x512&seed=${fileHash.substring(0, 8)}`;
    
    // 更新用户头像
    user.userInfo.avatar = avatarUrl;
    await user.save();
    
    const duration = Date.now() - startTime;
    logger.info('✅ 头像上传成功', {
      userId,
      avatarUrl,
      fileName,
      fileSize: req.file.size,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, avatarUrl });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 头像上传失败', {
      userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ error: '上传失败', details: errorInfo.message });
  }
});

module.exports = router;
