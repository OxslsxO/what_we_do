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
  SecretId: process.env.TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.TENCENT_CLOUD_SECRET_KEY
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

function buildPostPreview(post) {
  const postObj = post.toObject ? post.toObject() : { ...post };
  const lines = (postObj.content || '').split('\n');
  const previewLines = lines.slice(0, 3);
  const previewContent = previewLines.join('\n');

  postObj.title = postObj.title || lines[0] || '';
  postObj.summary = postObj.summary || previewContent;
  postObj.content = postObj.summary || previewContent;

  if (!postObj.author) {
    postObj.author = {
      userInfo: {
        avatar: '👤',
        name: '用户'
      }
    };
  } else if (!postObj.author.userInfo) {
    postObj.author.userInfo = {
      avatar: '👤',
      name: '用户'
    };
  }

  return postObj;
}

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
    
    const processedPosts = posts.map(buildPostPreview);
    
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
        posts: processedPosts,
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
router.post('/create', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 检查请求是否为 JSON 格式
    let title, summary, content, tags, playType, templateType, sourceModule, relationId, actionId, memoryId, status;
    let author, imageUrls = [];
    let data = {};
    
    // 处理请求数据
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      // JSON 格式请求
      data = req.body;
      title = data.title;
      summary = data.summary;
      content = data.content;
      tags = data.tags;
      playType = data.playType;
      templateType = data.templateType;
      sourceModule = data.sourceModule;
      relationId = data.relationId;
      actionId = data.actionId;
      memoryId = data.memoryId;
      status = data.status;
      author = data.author;
    } else {
      // 表单格式请求（文件上传）
      data = req.body;
      title = req.body.title;
      summary = req.body.summary;
      content = req.body.content;
      tags = req.body.tags;
      playType = req.body.playType;
      templateType = req.body.templateType;
      sourceModule = req.body.sourceModule;
      relationId = req.body.relationId;
      actionId = req.body.actionId;
      memoryId = req.body.memoryId;
      status = req.body.status;
      author = req.body.author;
    }
    
    logger.info('📝 创建帖子请求', {
      titleLength: title ? title.length : 0,
      contentTypeLength: content ? content.length : 0,
      hasImages: data.images ? data.images.length > 0 : false,
      tagsCount: tags ? (Array.isArray(tags) ? tags.length : 1) : 0,
      playType,
      templateType,
      sourceModule
    });
    
    // 处理上传的图片
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // 处理图片（支持 base64 和文件路径）
      const uploadPromises = data.images.map((image, index) => {
        return new Promise((resolve) => {
          try {
            // 检查是否为 base64 编码
            if (image.startsWith('data:image/')) {
              // 处理 base64 编码的图片
              const base64Data = image.replace(/^data:image\/(jpeg|png|gif);base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const fileName = `images/${Date.now()}-${index}-${Math.round(Math.random() * 1E9)}.jpg`;
              
              cos.putObject({
                Bucket: process.env.TENCENT_CLOUD_BUCKET,
                Region: process.env.TENCENT_CLOUD_REGION,
                Key: fileName,
                Body: buffer,
                ContentType: 'image/jpeg'
              }, (err, data) => {
                if (err) {
                  logger.warn('⚠️ COS 图片上传失败', { error: err.message });
                  resolve('');
                } else {
                  const imageUrl = `${process.env.TENCENT_CLOUD_DOMAIN}/${fileName}`;
                  resolve(imageUrl);
                }
              });
            } else {
              // 处理文件路径（这里只是占位，实际需要前端上传文件）
              logger.warn('⚠️ 收到文件路径，需要前端上传文件', { path: image });
              resolve('');
            }
          } catch (error) {
            logger.warn('⚠️ 处理图片失败', { error: error.message });
            resolve('');
          }
        });
      });
      
      imageUrls = (await Promise.all(uploadPromises)).filter(url => url);
      logger.info('✅ 图片处理完成', { count: imageUrls.length });
    } else {
      // 没有图片，使用空数组
      imageUrls = [];
      logger.debug('ℹ️ 无图片上传');
    }
    
    // 处理上传的视频
    let videoUrls = [];
    if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
      // 处理视频（支持 base64 和文件路径）
      const uploadPromises = data.videos.map((video, index) => {
        return new Promise((resolve) => {
          try {
            // 检查是否为 base64 编码
            if (video.startsWith('data:video/')) {
              // 处理 base64 编码的视频
              const base64Data = video.replace(/^data:video\/mp4;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const fileName = `videos/${Date.now()}-${index}-${Math.round(Math.random() * 1E9)}.mp4`;
              
              cos.putObject({
                Bucket: process.env.TENCENT_CLOUD_BUCKET,
                Region: process.env.TENCENT_CLOUD_REGION,
                Key: fileName,
                Body: buffer,
                ContentType: 'video/mp4'
              }, (err, data) => {
                if (err) {
                  logger.warn('⚠️ COS 视频上传失败', { error: err.message });
                  resolve('');
                } else {
                  const videoUrl = `${process.env.TENCENT_CLOUD_DOMAIN}/${fileName}`;
                  resolve(videoUrl);
                }
              });
            } else {
              // 处理文件路径（这里只是占位，实际需要前端上传文件）
              logger.warn('⚠️ 收到文件路径，需要前端上传文件', { path: video });
              resolve('');
            }
          } catch (error) {
            logger.warn('⚠️ 处理视频失败', { error: error.message });
            resolve('');
          }
        });
      });
      
      videoUrls = (await Promise.all(uploadPromises)).filter(url => url);
      logger.info('✅ 视频处理完成', { count: videoUrls.length });
    } else {
      // 没有视频，使用空数组
      videoUrls = [];
      logger.debug('ℹ️ 无视频上传');
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
      title: title || '',
      summary: summary || '',
      content,
      images: imageUrls,
      videos: videoUrls,
      tags: tagIds,
      playType,
      templateType: templateType || '',
      sourceModule: sourceModule || '',
      relationId: relationId || '',
      actionId: actionId || '',
      memoryId: memoryId || '',
      status: status || 'published'
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

// 获取用户的点赞和收藏记录（需要放在动态路由前面）
router.get('/user/interactions', async (req, res) => {
  const startTime = Date.now();

  try {
    const { userId } = req.query;

    logger.info('📳 获取用户交互记录', { userId });

    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }

    const likes = await Like.find({ user: userIdObj }, 'post');
    const likedPostIds = likes.map((like) => like.post.toString());

    const collections = await Collection.find({ user: userIdObj }, 'post');
    const collectedPostIds = collections.map((collection) => collection.post.toString());

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
    logger.error('❌ 获取交互记录失败', {
      userId: req.query.userId,
      duration: `${duration}ms`,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });

    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 获取用户收藏的帖子
router.get('/user/collections', async (req, res) => {
  const startTime = Date.now();

  try {
    const { userId, page = 1, limit = 10 } = req.query;

    logger.info('📚 获取用户收藏列表', {
      userId,
      page,
      limit
    });

    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }

    const collections = await Collection.find({ user: userIdObj })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate({
        path: 'post',
        populate: [
          { path: 'author', select: 'userInfo.avatar userInfo.name' },
          { path: 'tags', select: 'name' }
        ]
      });

    const total = await Collection.countDocuments({ user: userIdObj });
    const posts = collections
      .map((item) => item.post)
      .filter(Boolean)
      .map(buildPostPreview);

    const duration = Date.now() - startTime;
    logger.info('✅ 获取收藏列表成功', {
      userId,
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
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('❌ 获取收藏列表失败', {
      userId: req.query.userId,
      duration: `${duration}ms`,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });

    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 点赞帖子（前端调用的切换接口，需要放在动态路由前面）
router.post('/like', async (req, res) => {
  const startTime = Date.now();

  try {
    const { postId, userId } = req.body;

    logger.info('👍 点赞请求', { postId, userId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }

    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }

    const existingLike = await Like.findOne({ user: userIdObj, post: postId });
    if (existingLike) {
      await Like.deleteOne({ user: userIdObj, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });
      return res.json({ success: true, message: '取消点赞成功' });
    }

    const like = new Like({ user: userIdObj, post: postId });
    await like.save();
    await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });

    const duration = Date.now() - startTime;
    logger.info('✅ 点赞切换成功', { postId, userId, duration: `${duration}ms` });

    res.json({ success: true, message: '点赞成功' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 收藏帖子（前端调用的切换接口，需要放在动态路由前面）
router.post('/collect', async (req, res) => {
  const startTime = Date.now();

  try {
    const { postId, userId } = req.body;

    logger.info('⭐ 收藏请求', { postId, userId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }

    let userIdObj = userId;
    if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId('600000000000000000000000');
    }

    const existingCollection = await Collection.findOne({ user: userIdObj, post: postId });
    if (existingCollection) {
      await Collection.deleteOne({ user: userIdObj, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { collections: -1 } });
      return res.json({ success: true, message: '取消收藏成功' });
    }

    const collection = new Collection({ user: userIdObj, post: postId });
    await collection.save();
    await Post.findByIdAndUpdate(postId, { $inc: { collections: 1 } });

    const duration = Date.now() - startTime;
    logger.info('✅ 收藏切换成功', { postId, userId, duration: `${duration}ms` });

    res.json({ success: true, message: '收藏成功' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 分享帖子，需要放在动态路由前面
router.post('/share', async (req, res) => {
  try {
    const { postId, userId } = req.body;

    logger.info('↗️ 分享请求', { postId, userId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }

    await Post.findByIdAndUpdate(postId, { $inc: { shares: 1 } });

    res.json({ success: true, message: '分享成功' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

// 点赞帖子（前端调用的接口）
router.post('/like', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { postId, userId } = req.body;
    
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
      // 已点赞，取消点赞
      await Like.deleteOne({ user: userIdObj, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });
      logger.info('💔 取消点赞成功', { postId, userId });
      return res.json({ success: true, message: '取消点赞成功' });
    } else {
      // 未点赞，添加点赞
      const like = new Like({ user: userIdObj, post: postId });
      await like.save();
      await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });
      logger.info('✅ 点赞成功', { postId, userId });
      return res.json({ success: true, message: '点赞成功' });
    }
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
      postId: req.body.postId,
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

// 收藏帖子（前端调用的接口）
router.post('/collect', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { postId, userId } = req.body;
    
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
      // 已收藏，取消收藏
      await Collection.deleteOne({ user: userIdObj, post: postId });
      await Post.findByIdAndUpdate(postId, { $inc: { collections: -1 } });
      logger.info('💔 取消收藏成功', { postId, userId });
      return res.json({ success: true, message: '取消收藏成功' });
    } else {
      // 未收藏，添加收藏
      const collection = new Collection({ user: userIdObj, post: postId });
      await collection.save();
      await Post.findByIdAndUpdate(postId, { $inc: { collections: 1 } });
      logger.info('✅ 收藏成功', { postId, userId });
      return res.json({ success: true, message: '收藏成功' });
    }
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
      postId: req.body.postId,
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

// 分享帖子
router.post('/share', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { postId, userId } = req.body;
    
    logger.info('↗️ 分享请求', { postId, userId });
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        logger.warn('⚠️ 无效的帖子 ID', { postId });
        return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }
    
    // 更新帖子分享数
    await Post.findByIdAndUpdate(postId, { $inc: { shares: 1 } });
    
    const duration = Date.now() - startTime;
    logger.info('✅ 分享成功', { postId, userId, duration: `${duration}ms` });
    
    res.json({ success: true, message: '分享成功' });
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
    
    logger.error('❌ 分享失败', {
      postId: req.body.postId,
      userId: req.body.userId,
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('分享帖子错误:', errorInfo);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: errorInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errorInfo.stack : undefined
    });
  }
});

module.exports = router;
