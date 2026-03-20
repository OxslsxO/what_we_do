const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const COS = require('cos-nodejs-sdk-v5');

// 导入统一的 logger
const logger = require('../utils/logger');

// 初始化 COS 客户端
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY
});

// 导入模型
const Post = require('../models/Post');
const Tag = require('../models/Tag');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Collection = require('../models/Collection');

// 创建上传目录
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer，使用内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ========== 获取广场帖子列表 ==========
router.get('/feed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { page = 1, limit = 10, tag, playType } = req.query;
    
    logger.info('📰 获取广场帖子列表', {
      page,
      limit,
      tag,
      playType
    });
    
    const query = {};
    if (tag) {
      // 查找标签 ID
      const tagDoc = await Tag.findOne({ name: tag });
      if (tagDoc) {
        query.tags = tagDoc._id;
      }
    }
    if (playType) {
      query.playType = playType;
    }
    
    const posts = await Post.find(query)
      .populate('author', 'userInfo.avatar userInfo.name')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await Post.countDocuments(query);
    const duration = Date.now() - startTime;
    
    logger.info('✅ 获取广场帖子成功', {
      count: posts.length,
      total,
      page,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    // 安全的错误处理
    const errorInfo = err ? (typeof err === 'object' ? {
      name: err.name || 'UnknownError',
      message: err.message || 'Unknown error occurred',
      stack: err.stack || 'No stack trace'
    } : {
      message: String(err)
    }) : {
      message: 'Error object is undefined'
    };
    
    logger.error('❌ 获取广场帖子失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// ========== 创建帖子 ==========
router.post('/create', upload.array('images', 9), async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 检查请求是否为 JSON 格式
    let content, tags, playType, author, imageUrls = [];
    let data = {};
    
    // 处理请求数据
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      // JSON 格式请求
      data = req.body;
      content = data.content;
      tags = data.tags;
      playType = data.playType;
      author = data.author;
    } else {
      // 表单格式请求（文件上传）
      data = req.body;
      content = req.body.content;
      tags = req.body.tags;
      playType = req.body.playType;
      author = req.body.author;
    }
    
    logger.info('📝 创建帖子请求', {
      contentTypeLength: content ? content.length : 0,
      fileCount: req.files ? req.files.length : 0,
      hasImages: data.images ? data.images.length > 0 : false,
      tagsCount: tags ? (Array.isArray(tags) ? tags.length : 1) : 0,
      playType
    });
    
    // 处理上传的图片
    if (req.files && req.files.length > 0) {
      // 上传到腾讯云 COS
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const fileName = `images/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
          console.log('开始上传图片到 COS:', {
            Bucket: process.env.COS_BUCKET,
            Region: process.env.COS_REGION,
            Key: fileName,
            ContentType: file.mimetype
          });
          cos.putObject({
            Bucket: process.env.COS_BUCKET,
            Region: process.env.COS_REGION,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
          }, (err, data) => {
            if (err) {
              console.error('上传 COS 失败:', err);
              reject(err);
            } else {
              console.log('上传 COS 成功:', data);
              const imageUrl = `${process.env.COS_DOMAIN}/${fileName}`;
              resolve(imageUrl);
            }
          });
        });
      });
      
      try {
        imageUrls = await Promise.all(uploadPromises);
        logger.info('✅ 图片上传 COS 成功', { count: imageUrls.length });
      } catch (error) {
        console.error('上传图片失败:', error);
        logger.warn('⚠️ COS 上传失败，回退到本地存储', { error: error.message });
        // 如果 COS 上传失败，回退到本地存储
        const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
        imageUrls = req.files.map(file => {
          const fileName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, file.buffer);
          return `${serverUrl}/uploads/${fileName}`;
        });
      }
    } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // 处理 base64 编码的图片
      console.log('开始处理 base64 编码的图片，数量:', data.images.length);
      const uploadPromises = data.images.map((base64Image, index) => {
        return new Promise((resolve, reject) => {
          try {
            // 提取 base64 数据
            const base64Data = base64Image.replace(/^data:image\/(jpeg|png|gif);base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `images/${Date.now()}-${index}-${Math.round(Math.random() * 1E9)}.jpg`;
            
            console.log('开始上传 base64 图片到 COS:', {
              Bucket: process.env.COS_BUCKET,
              Region: process.env.COS_REGION,
              Key: fileName,
              ContentType: 'image/jpeg',
              ImageSize: buffer.length
            });
            
            cos.putObject({
              Bucket: process.env.COS_BUCKET,
              Region: process.env.COS_REGION,
              Key: fileName,
              Body: buffer,
              ContentType: 'image/jpeg'
            }, (err, data) => {
              if (err) {
                console.error('上传 COS 失败:', err);
                reject(err);
              } else {
                console.log('上传 COS 成功:', data);
                const imageUrl = `${process.env.COS_DOMAIN}/${fileName}`;
                resolve(imageUrl);
              }
            });
          } catch (error) {
            console.error('处理 base64 图片失败:', error);
            reject(error);
          }
        });
      });
      
      try {
        imageUrls = await Promise.all(uploadPromises);
        logger.info('✅ Base64 图片上传成功', { count: imageUrls.length });
        console.log('所有 base64 图片上传成功，数量:', imageUrls.length);
      } catch (error) {
        console.error('上传 base64 图片失败:', error);
        logger.warn('⚠️ Base64 图片 COS 上传失败，回退到本地存储', { error: error.message });
        // 如果 COS 上传失败，回退到本地存储
        const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
        imageUrls = data.images.map((base64Image, index) => {
          try {
            const base64Data = base64Image.replace(/^data:image\/(jpeg|png|gif);base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `images-${Date.now()}-${index}-${Math.round(Math.random() * 1E9)}.jpg`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);
            return `${serverUrl}/uploads/${fileName}`;
          } catch (error) {
            console.error('保存 base64 图片到本地失败:', error);
            return '';
          }
        }).filter(url => url); // 过滤掉空字符串
        console.log('base64 图片回退到本地存储，成功数量:', imageUrls.length);
      }
    } else {
      // 没有图片，使用空数组
      imageUrls = [];
      logger.debug('ℹ️ 无图片上传');
    }
    
    // 处理标签
    const tagIds = [];
    if (tags) {
      let tagArray = [];
      try {
        if (typeof tags === 'string') {
          tagArray = JSON.parse(tags);
        } else if (Array.isArray(tags)) {
          tagArray = tags;
        }
      } catch (e) {
        if (typeof tags === 'string') {
          tagArray = [tags];
        }
      }
      
      if (Array.isArray(tagArray)) {
        for (const tagName of tagArray) {
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = new Tag({ name: tagName });
            await tag.save();
            logger.info('🏷️ 创建新标签', { name: tagName });
          } else {
            tag.count += 1;
            await tag.save();
            logger.debug('🔄 更新标签计数', { name: tagName, count: tag.count });
          }
          tagIds.push(tag._id);
        }
      }
    }
    
    // 检查 author 是否为有效 ObjectId，如果不是则使用默认值
    let authorId = author;
    if (typeof author === 'string' && !mongoose.Types.ObjectId.isValid(author)) {
      // 使用固定的默认 ObjectId
      authorId = new mongoose.Types.ObjectId('600000000000000000000000');
      logger.warn('⚠️ 无效的 author ID，使用默认值');
    }
    
    const post = new Post({
      author: authorId,
      content,
      images: imageUrls,
      tags: tagIds,
      playType
    });
    
    await post.save();
    
    // populate 相关数据
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'userInfo.avatar userInfo.name')
      .populate('tags', 'name');
    
    const duration = Date.now() - startTime;
    logger.info('✅ 帖子创建成功', {
      postId: post._id,
      imageCount: imageUrls.length,
      tagCount: tagIds.length,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, data: populatedPost });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ 创建帖子失败', {
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    console.error('创建帖子错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取用户自己的帖子
router.get('/my', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { page = 1, limit = 10, userId } = req.query;
    
    logger.info('📋 获取用户自己的帖子', {
      page,
      limit,
      userId
    });
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 查询用户的帖子
    const posts = await Post.find({ author: userIdObj })
      .populate('author', 'userInfo.avatar userInfo.name')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await Post.countDocuments({ author: userIdObj });
    const duration = Date.now() - startTime;
    
    logger.info('✅ 获取用户帖子成功', {
      count: posts.length,
      total,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ 获取用户帖子失败', {
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    console.error('获取用户帖子错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取热门标签
router.get('/tags/hot', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🏷️ 获取热门标签');
    
    const tags = await Tag.find({})
      .sort({ count: -1 })
      .limit(20);
    
    const duration = Date.now() - startTime;
    logger.info('✅ 获取热门标签成功', {
      count: tags.length,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, data: tags });
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
    
    logger.error('❌ 获取热门标签失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('服务器错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 获取帖子详情
router.get('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const postId = req.params.id;
    logger.info('🔍 获取帖子详情', { postId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    const post = await Post.findById(postId)
      .populate('author', 'userInfo.avatar userInfo.name')
      .populate('tags', 'name');
    
    if (!post) {
      logger.warn('⚠️ 帖子不存在', { postId });
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    const duration = Date.now() - startTime;
    logger.info('✅ 获取帖子详情成功', {
      postId,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, data: post });
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
    
    logger.error('❌ 获取帖子详情失败', {
      postId: req.params.id,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('服务器错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 点赞帖子
router.post('/:id/like', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.body;
    const postId = req.params.id;
    
    logger.info('👍 点赞请求', { postId, userId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 检查是否已点赞
    const existingLike = await Like.findOne({ user: userIdObj, post: postId });
    if (existingLike) {
      logger.warn('⚠️ 已经点赞过了', { postId, userId });
      return res.json({ success: false, message: '已经点赞过了' });
    }
    
    // 创建点赞记录
    const like = new Like({ user: userIdObj, post: postId });
    await like.save();
    
    // 更新帖子点赞数
    await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 点赞成功', { postId, userId, duration: `${duration}ms` });
    
    res.json({ success: true, message: '点赞成功' });
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
    
    logger.error('❌ 点赞失败', {
      postId: req.params.id,
      userId: req.body.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('点赞帖子错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 取消点赞
router.post('/:id/unlike', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.body;
    const postId = req.params.id;
    
    logger.info('💔 取消点赞请求', { postId, userId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 检查是否已点赞
    const existingLike = await Like.findOne({ user: userIdObj, post: postId });
    if (!existingLike) {
      logger.warn('⚠️ 还没有点赞', { postId, userId });
      return res.json({ success: false, message: '还没有点赞' });
    }
    
    // 删除点赞记录
    await Like.deleteOne({ user: userIdObj, post: postId });
    
    // 更新帖子点赞数
    await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 取消点赞成功', { postId, userId, duration: `${duration}ms` });
    
    res.json({ success: true, message: '取消点赞成功' });
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
    
    logger.error('❌ 取消点赞失败', {
      postId: req.params.id,
      userId: req.body.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('取消点赞错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 收藏帖子
router.post('/:id/collect', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.body;
    const postId = req.params.id;
    
    logger.info('⭐ 收藏请求', { postId, userId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 检查是否已收藏
    const existingCollection = await Collection.findOne({ user: userIdObj, post: postId });
    if (existingCollection) {
      logger.warn('⚠️ 已经收藏过了', { postId, userId });
      return res.json({ success: false, message: '已经收藏过了' });
    }
    
    // 创建收藏记录
    const collection = new Collection({ user: userIdObj, post: postId });
    await collection.save();
    
    // 更新帖子收藏数
    await Post.findByIdAndUpdate(postId, { $inc: { collections: 1 } });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 收藏成功', { postId, userId, duration: `${duration}ms` });
    
    res.json({ success: true, message: '收藏成功' });
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
    
    logger.error('❌ 收藏失败', {
      postId: req.params.id,
      userId: req.body.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('收藏帖子错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 取消收藏
router.post('/:id/uncollect', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.body;
    const postId = req.params.id;
    
    logger.info('💔 取消收藏请求', { postId, userId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 检查是否已收藏
    const existingCollection = await Collection.findOne({ user: userIdObj, post: postId });
    if (!existingCollection) {
      logger.warn('⚠️ 还没有收藏', { postId, userId });
      return res.json({ success: false, message: '还没有收藏' });
    }
    
    // 删除收藏记录
    await Collection.deleteOne({ user: userIdObj, post: postId });
    
    // 更新帖子收藏数
    await Post.findByIdAndUpdate(postId, { $inc: { collections: -1 } });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 取消收藏成功', { postId, userId, duration: `${duration}ms` });
    
    res.json({ success: true, message: '取消收藏成功' });
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
    
    logger.error('❌ 取消收藏失败', {
      postId: req.params.id,
      userId: req.body.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('取消收藏错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 评论帖子
router.post('/:id/comment', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, content } = req.body;
    const postId = req.params.id;
    
    logger.info('💬 评论请求', { 
      postId, 
      userId,
      contentLength: content ? content.length : 0,
      contentPreview: content ? content.substring(0, 50) : ''
    });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 创建评论
    const comment = new Comment({
      post: postId,
      author: userIdObj,
      content
    });
    
    await comment.save();
    
    // 更新帖子评论数
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });
    
    // populate 作者信息
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'userInfo.avatar userInfo.name');
    
    const duration = Date.now() - startTime;
    logger.info('✅ 评论成功', { 
      postId, 
      commentId: comment._id,
      duration: `${duration}ms`
    });
    
    res.json({ success: true, data: populatedComment });
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
    
    logger.error('❌ 评论失败', {
      postId: req.params.id,
      userId: req.body.userId,
      content: req.body.content ? req.body.content.substring(0, 50) : '',
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('评论帖子错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 获取帖子评论
router.get('/:id/comments', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { page = 1, limit = 20 } = req.query;
    const postId = req.params.id;
    
    logger.info('📋 获取帖子评论', { postId, page, limit });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    const comments = await Comment.find({ post: postId })
      .populate('author', 'userInfo.avatar userInfo.name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await Comment.countDocuments({ post: postId });
    const duration = Date.now() - startTime;
    
    logger.info('✅ 获取评论成功', {
      postId,
      count: comments.length,
      total,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
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
    
    logger.error('❌ 获取评论失败', {
      postId: req.params.id,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('服务器错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

// 获取用户的点赞和收藏记录
router.get('/user/interactions', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.query;
    
    logger.info('📊 获取用户交互记录', { userId });
    
    // 检查 userId 是否为有效 ObjectId，如果不是则使用默认值
    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }
    
    // 获取用户的点赞记录
    const likes = await Like.find({ user: userIdObj }, 'post');
    const likedPostIds = likes.map(like => like.post.toString());
    
    // 获取用户的收藏记录
    const collections = await Collection.find({ user: userIdObj }, 'post');
    const collectedPostIds = collections.map(collection => collection.post.toString());
    
    const duration = Date.now() - startTime;
    logger.info('✅ 获取交互记录成功', {
      userId,
      likedCount: likedPostIds.length,
      collectedCount: collectedPostIds.length,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      data: {
        likedPosts: likedPostIds,
        collectedPosts: collectedPostIds
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
    
    logger.error('❌ 获取交互记录失败', {
      userId: req.query.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('获取用户交互记录错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

module.exports = router;
