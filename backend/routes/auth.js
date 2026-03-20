const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// 导入统一的 logger
const logger = require('../utils/logger');

dotenv.config();

// ========== 注册接口 ==========
router.post('/register', async (req, res) => {
  const startTime = Date.now();
  const { phone, password } = req.body;
  
  logger.info('📝 注册请求', {
    phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
    hasPassword: !!password,
    passwordLength: password ? password.length : 0
  });
  
  try {
    // 检查用户是否已存在
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      logger.warn('⚠️ 注册失败 - 账号已存在', { phone });
      return res.status(400).json({ error: '账号已注册' });
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
    
    logger.info('✅ 注册成功', {
      phone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 'empty',
      userId: newUser._id,
      duration: `${duration}ms`
    });
    
    res.status(201).json({ message: '注册成功' });
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

// ========== 登录接口 ==========
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
    
    // 合并用户信息，确保保留原有字段
    const updatedUserInfo = {
      ...user.userInfo,
      ...userInfo
    };
    
    console.log('合并后的用户信息:', updatedUserInfo);
    
    // 更新用户信息
    user.userInfo = updatedUserInfo;
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
      updatedFields: Object.keys(updatedUserInfo),
      duration: `${duration}ms`
    });
    
    res.json({ 
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

module.exports = router;
