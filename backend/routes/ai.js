const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');
const cache = require('memory-cache');

// 导入 logger
const logger = require('../utils/logger');
const { checkImageExists, getImageUrl, uploadImage } = require('../utils/cos');
const Recipe = require('../models/Recipe');

// 缓存配置
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 模拟 OpenAI API 响应
const generateAIResponse = (prompt, type) => {
  // 基础内容库
  const contentLibrary = {
    chat: {
      basic: [
        "你最近最想尝试的一件新鲜事是什么？",
        "如果我们可以拥有一项超能力，你会选什么？",
        "你小时候最想成为的职业是什么？",
        "如果你可以穿越到过去，你最想回到哪一天？",
        "你最近看的一部电影是什么？觉得怎么样？",
        "你最喜欢的季节是什么？为什么？",
        "如果你可以和任何一个历史人物共进晚餐，你会选谁？",
        "你最近学到了什么新东西？"
      ],
      interactive: [
        "互相说出对方 3 个让自己瞬间心动的小细节",
        "模仿对方的一个标志性小动作，看看谁模仿得更像",
        "轮流说出一个对方的小缺点，但要用夸奖的语气表达",
        "互相给对方起一个可爱的昵称，然后解释为什么",
        "一起完成一个小挑战，比如 30 秒内说出 10 个喜欢对方的理由",
        "互相分享今天最开心的一件事"
      ],
      memory: [
        "还记得我们第一次约会时，你心里偷偷在想什么？",
        "分享一个我们之间最让你难忘的暖心瞬间",
        "说说你第一次见我时，对我的第一印象是什么？",
        "回忆一下我们一起度过的最开心的一天",
        "分享一个我们之间的小秘密，对方可能不知道的",
        "说说你最珍惜我们之间的哪段回忆？"
      ],
      deep: [
        "你觉得理想的情侣相处模式是什么样的？",
        "如果我们以后有了小家，你想把家里布置成什么风格？",
        "你最近有没有什么小烦恼，想和我吐槽一下？",
        "你觉得我们之间最需要改进的地方是什么？",
        "如果可以给我们的关系打分，你会打多少分？为什么？",
        "你对我们的未来有什么期待？"
      ]
    },
    activity: {
      home: [
        "一起做一道简单的甜品（比如双皮奶），最后比拼一下谁做的口感更好",
        "一起整理衣柜，把衣物按照颜色和季节分类，顺便互相吐槽对方的穿搭品味",
        "找一部经典爱情电影一起观看，看完后互相分享观后感",
        "一起玩一局你画我猜，输的人要答应对方一个小要求",
        "一起做手工，比如折星星或者做手链",
        "一起研究一个新的菜谱，然后尝试做出来"
      ],
      outdoor: [
        "去附近的公园散步，收集 3 种不同形状的树叶，回家后做成简易书签",
        "一起去菜市场采购食材，然后回家合作做一顿晚餐",
        "去便利店买一堆零食，找一个安静的角落边吃边分享最近的趣事",
        "去附近的咖啡店，点不同的饮品，互相品尝",
        "一起去图书馆，找一本感兴趣的书，一起阅读",
        "去公园喂鸽子，观察它们的有趣行为"
      ],
      online: [
        "连麦同步观看一部电影，随时和对方分享自己的观影感受",
        "一起玩一款线上双人小游戏（比如联机消消乐），输的人要给对方唱一首歌",
        "同时开始做同一个小挑战（比如平板支撑 1 分钟），互相监督完成",
        "一起在线上学习一个新技能，比如简单的绘画或手工",
        "一起听同一首歌，然后分享各自的感受",
        "一起做线上性格测试，然后分享结果"
      ]
    },
    photo: {
      home: [
        "一起躺在床上头靠头，拍一张闭眼的温馨氛围感照片",
        "互相给对方画一个搞怪妆容，拍一组搞笑表情包照片",
        "用家里的玩偶、零食当道具，拍一组创意情侣合照",
        "一起做鬼脸，拍一组搞怪的表情包",
        "在厨房一起做饭时，拍一张互动的温馨照片",
        "一起看书时，拍一张安静的氛围感照片"
      ],
      outdoor: [
        "在路边路灯下，拍一组牵手的影子特写照片",
        "在公园草地上，互相背对方，拍一组搞笑互动照片",
        "在咖啡店门口，拍一组一起喝咖啡的慵懒氛围感照片",
        "在街头巷尾，拍一组牵手走路的背影照",
        "在公园里，拍一组互相追逐的动态照片",
        "在日落时分，拍一组逆光的浪漫照片"
      ],
      travel: [
        "在景点标志性建筑前，拍一组假装被建筑「吃掉」的搞怪打卡照",
        "在海边沙滩上，用树枝写下对方的名字，拍一张纪念照片",
        "在旅行路上，拍一组牵手走路的背影照，记录沿途的风景",
        "在山顶上，拍一组拥抱的全景照片",
        "在特色小店前，拍一组互动的趣味照片",
        "在陌生城市的街头，拍一组迷路却开心的照片"
      ]
    },
   宠点啥: {
      daily: [
        "给对方写一张暖心小纸条，偷偷放在对方的包里或者床头",
        "给对方泡一杯热饮，加上一个爱心形状的棉花糖",
        "帮对方按摩 10 分钟，缓解一天的疲劳",
        "偷偷把对方的手机壁纸换成你们的合照",
        "为对方准备一份简单的早餐，加上一个小惊喜",
        "帮对方整理书桌或房间，给对方一个干净的空间"
      ],
      surprise: [
        "偷偷买一个对方最近提到过的小零食，放在对方的书桌前",
        "用对方的照片做一个简易拼图，作为小礼物送给对方",
        "给对方录一段语音，分享今天你觉得他 / 她很可爱的瞬间",
        "为对方准备一个小惊喜，比如突然出现在对方公司楼下",
        "用便利贴在对方的房间贴满爱的留言",
        "为对方做一个专属的播放列表，包含对方喜欢的歌曲"
      ],
      holiday: [
        "在纪念日时，折 10 个纸星星，每个星星里写一句想对对方说的话",
        "在对方生日时，用蜡烛在桌上摆一个小爱心，然后给对方一个拥抱",
        "在情人节时，亲手做一份巧克力，包装成精美的礼物",
        "在圣诞节时，为对方准备一个小惊喜，比如偷偷装饰房间",
        "在对方的生日时，收集朋友们的祝福视频，做成一个合集",
        "在纪念日时，重走第一次约会的路线，重温美好回忆"
      ]
    },
    攒点啥: {
      money: [
        "今天一起攒 10 元，作为我们下周吃火锅的基金",
        "今天一起攒 20 元，用来买我们想要的情侣小挂件",
        "今天一起攒 50 元，为我们的旅行基金添一笔",
        "今天一起攒 5 元，作为我们的电影基金",
        "今天一起攒 30 元，为我们的纪念礼物基金添一笔",
        "今天一起攒 100 元，为我们的大目标做准备"
      ],
      memory: [
        "今天一起写一件我们的小事，放进回忆盒子里",
        "今天一起拍一张合照，打印出来贴在我们的回忆墙上",
        "今天一起记录一个小约定，写在专属的小本子里",
        "今天一起收集一张电影票根，放进回忆册里",
        "今天一起写一句想对对方说的话，放进时光胶囊",
        "今天一起记录一件开心的事，作为我们的快乐回忆"
      ],
      habit: [
        "今天一起养成早起 10 分钟的习惯，然后一起吃早餐",
        "今天一起学一个简单的小魔术，之后表演给对方看",
        "今天一起攒一个好习惯，比如睡前一起读 10 页书",
        "今天一起养成多喝水的习惯，互相监督",
        "今天一起养成运动的习惯，比如一起做 10 分钟拉伸",
        "今天一起养成写日记的习惯，记录我们的每一天"
      ]
    }
  };

  // 根据类型生成内容
  if (contentLibrary[type]) {
    const categories = contentLibrary[type];
    const categoryKeys = Object.keys(categories);
    const randomCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    const items = categories[randomCategory];
    return items[Math.floor(Math.random() * items.length)];
  }

  // 默认返回
  return "今天我们一起度过美好的一天吧！";
};

// 生成 AI 内容
router.post('/generate', (req, res) => {
  const startTime = Date.now();
  
  try {
    const { type, category } = req.body;
    
    logger.info('🤖 AI 内容生成请求', {
      type,
      category,
      hasType: !!type,
      hasCategory: !!category
    });
    
    if (!type) {
      logger.warn('⚠️ AI 生成失败 - 缺少类型参数', { type, category });
      return res.status(400).json({ error: '缺少类型参数' });
    }
    
    const content = generateAIResponse(`生成一个${type}的内容`, type);
    const duration = Date.now() - startTime;
    
    logger.info('✅ AI 内容生成成功', {
      type,
      category,
      contentLength: content.length,
      contentPreview: content.substring(0, 50),
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      content: content
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
    
    logger.error('❌ AI 内容生成失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('生成内容失败:', errorInfo);
    res.status(500).json({ error: '生成失败', details: errorInfo.message });
  }
});

// 生成食物图片
router.post('/generate-image', async (req, res) => {
  const startTime = Date.now();
  
  try {
    let foodName = req.body.foodName;
    
    logger.info('接收到的原始食物名称:', { raw: req.body.foodName, type: typeof req.body.foodName });
    
    // 解码食物名称
    if (foodName && typeof foodName === 'string') {
      try {
        foodName = decodeURIComponent(foodName);
        logger.info('食物名称解码成功:', { original: req.body.foodName, decoded: foodName });
      } catch (error) {
        logger.error('食物名称解码失败:', { error: error.message, stack: error.stack });
      }
    }
    
    logger.info('🤖 AI 图片生成请求', { foodName, rawBody: req.body });
    
    if (!foodName) {
      logger.warn('⚠️ AI 图片生成失败 - 缺少食物名称参数');
      return res.status(400).json({ error: '缺少食物名称参数' });
    }
    
    // 检查缓存
    const cacheKey = `image_${foodName}`;
    const cachedImageUrl = cache.get(cacheKey);
    if (cachedImageUrl) {
      const duration = Date.now() - startTime;
      logger.info('✅ 从缓存获取图片', { foodName, imageUrl: cachedImageUrl, duration: `${duration}ms` });
      return res.json({
        success: true,
        imageUrl: cachedImageUrl
      });
    }
    
    // 检查腾讯云COS中是否存在该食物的图片
    const exists = await checkImageExists(foodName);
    
    if (exists) {
      // 图片存在，直接返回URL
      const imageUrl = getImageUrl(foodName);
      // 缓存结果
      cache.put(cacheKey, imageUrl, CACHE_DURATION);
      const duration = Date.now() - startTime;
      
      logger.info('✅ 图片已存在，直接返回', { foodName, imageUrl, duration: `${duration}ms` });
      
      return res.json({
        success: true,
        imageUrl
      });
    }
    
    // 图片不存在，调用closeai接口生成图片
    logger.info('🖼️ 生成新图片', { foodName });
    
    // 调用closeai接口生成图片
    const generateImage = async () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.closeai-proxy.xyz',
          port: 443,
          path: '/v1/images/generations',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-K7coBb0A4WUFjXaBMsY6hU1GpF2MQOEF4C2bqDsNd1w8HRlw'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.data && response.data[0] && response.data[0].url) {
                resolve(response.data[0].url);
              } else {
                reject(new Error('Invalid response from CloseAI'));
              }
            } catch (error) {
              reject(error);
            }
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(JSON.stringify({
          model: 'dall-e-3',
          prompt: `一张美味的${foodName}的图片，高清，真实感强，餐厅风格`,
          n: 1,
          size: '1024x1024'
        }));
        
        req.end();
      });
    };
    
    // 生成图片
    const generatedImageUrl = await generateImage();
    
    // 下载图片并上传到腾讯云COS
    const downloadAndUpload = async (imageUrl) => {
      return new Promise((resolve, reject) => {
        https.get(imageUrl, (response) => {
          const chunks = [];
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });
          response.on('end', async () => {
            try {
              const imageBuffer = Buffer.concat(chunks);
              const uploadedImageUrl = await uploadImage(foodName, imageBuffer);
              resolve(uploadedImageUrl);
            } catch (error) {
              reject(error);
            }
          });
          response.on('error', (error) => {
            reject(error);
          });
        });
      });
    };
    
    // 下载并上传图片
    const uploadedImageUrl = await downloadAndUpload(generatedImageUrl);
    
    // 缓存结果
    cache.put(cacheKey, uploadedImageUrl, CACHE_DURATION);
    
    const duration = Date.now() - startTime;
    
    logger.info('✅ 图片生成并上传成功', {
      foodName,
      imageUrl: uploadedImageUrl,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      imageUrl: uploadedImageUrl
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
    
    logger.error('❌ AI 图片生成失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('生成图片失败:', errorInfo);
    
    // 失败时返回占位图
    const placeholderUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(req.body.foodName || '美食')}`;
    res.json({
      success: true,
      imageUrl: placeholderUrl
    });
  }
});

// 生成食物攻略
router.post('/generate-recipe', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { foodName } = req.body;
    
    logger.info('🤖 AI 攻略生成请求', { foodName });
    
    if (!foodName) {
      logger.warn('⚠️ AI 攻略生成失败 - 缺少食物名称参数');
      return res.status(400).json({ error: '缺少食物名称参数' });
    }
    
    // 检查缓存
    const cacheKey = `recipe_${foodName}`;
    const cachedRecipe = cache.get(cacheKey);
    if (cachedRecipe) {
      const duration = Date.now() - startTime;
      logger.info('✅ 从缓存获取攻略', { foodName, duration: `${duration}ms` });
      return res.json({
        success: true,
        content: cachedRecipe
      });
    }
    
    // 检查数据库中是否存在该食物的攻略
    let recipe = await Recipe.findOne({ foodName });
    
    if (recipe) {
      // 攻略存在，直接返回
      // 缓存结果
      cache.put(cacheKey, recipe.content, CACHE_DURATION);
      const duration = Date.now() - startTime;
      
      logger.info('✅ 攻略已存在，直接返回', { foodName, duration: `${duration}ms` });
      
      return res.json({
        success: true,
        content: recipe.content
      });
    }
    
    // 攻略不存在，调用closeai接口生成攻略
    logger.info('📝 生成新攻略', { foodName });
    
    // 调用closeai接口生成攻略
    const generateRecipe = async () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.closeai-proxy.xyz',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-K7coBb0A4WUFjXaBMsY6hU1GpF2MQOEF4C2bqDsNd1w8HRlw'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
                resolve(response.choices[0].message.content.trim());
              } else {
                reject(new Error('Invalid response from CloseAI'));
              }
            } catch (error) {
              reject(error);
            }
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是专业美食厨师，提供详细菜谱，包含材料、步骤、小贴士，markdown格式' },
            { role: 'user', content: `提供${foodName}的详细制作方法` }
          ],
          temperature: 0.8,
          max_tokens: 1000
        }));
        
        req.end();
      });
    };
    
    // 生成攻略
    const recipeContent = await generateRecipe();
    
    // 存入数据库
    recipe = new Recipe({
      foodName,
      content: recipeContent
    });
    await recipe.save();
    
    // 缓存结果
    cache.put(cacheKey, recipeContent, CACHE_DURATION);
    
    const duration = Date.now() - startTime;
    
    logger.info('✅ 攻略生成并保存成功', {
      foodName,
      contentLength: recipeContent.length,
      duration: `${duration}ms`
    });
    
    res.json({
      success: true,
      content: recipeContent
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
    
    logger.error('❌ AI 攻略生成失败', {
      duration: `${duration}ms`,
      error: errorInfo
    });
    
    console.error('生成攻略失败:', errorInfo);
    
    // 失败时返回默认攻略
    const defaultRecipe = `# ${req.body.foodName || '美食'}制作方法\n\n## 材料\n- 材料1\n- 材料2\n- 材料3\n\n## 步骤\n1. 准备材料\n2. 处理食材\n3. 烹饪\n4. 装盘\n\n## 小贴士\n- 调整调料\n- 控制时间`;
    res.json({
      success: true,
      content: defaultRecipe
    });
  }
});

module.exports = router;
