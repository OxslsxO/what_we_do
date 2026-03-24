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

/**
 * 核心逻辑：模拟 AI 响应生成
 * 支持根据 relationType (lover/buddy) 自动过滤话题分类
 */
const generateAIResponse = (prompt, type, relationType = 'lover') => {
  // 基础内容库 (丰富版)
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
      ],
      buddy: [
        "下次哥几个/姐几个去哪儿搓一顿？",
        "最近有什么好玩的项目推荐吗？",
        "如果你中了彩票大奖，第一个告诉谁？",
        "分享一个你最近听到的最离谱的八卦"
      ]
    },
    activity: {
      home: [
        "一起做一道简单的甜品，最后比拼一下谁做的口感更好",
        "一起整理衣柜，顺便互相吐槽对方的穿搭品味",
        "找一部经典电影一起观看，看完后互相分享观后感",
        "一起玩一局你画我猜，输的人要答应对方一个小要求",
        "一起做手工，比如折星星或者做手链",
        "一起研究一个新的菜谱，然后尝试做出来"
      ],
      outdoor: [
        "去附近的公园散步，收集 3 种不同形状的树叶做成书签",
        "一起去菜市场采购食材，然后回家合作做一顿晚餐",
        "去便利店买一堆零食，找一个安静的角落边吃边分享趣事",
        "去附近的咖啡店，点不同的饮品，互相品尝",
        "一起去图书馆，找一本感兴趣的书，一起阅读"
      ],
      online: [
        "连麦同步观看一部电影，随时和对方分享自己的观影感受",
        "一起玩一款线上双人小游戏，输的人要给对方唱一首歌",
        "同时开始做同一个小挑战（比如平板支撑 1 分钟）",
        "一起在线上学习一个新技能，比如简单的绘画或手工"
      ]
    },
    photo: {
      home: [
        "一起躺在床上头靠头，拍一张闭眼的温馨氛围感照片",
        "互相给对方画一个搞怪妆容，拍一组搞笑表情包照片",
        "用家里的玩具、零食当道具，拍一组创意合照",
        "一起做鬼脸，拍一组搞怪的表情包"
      ],
      outdoor: [
        "在路灯下，拍一组牵手的影子特写照片",
        "在公园草地上，互相背对方，拍一组搞笑互动照片",
        "在咖啡店，拍一组一起喝咖啡的慵懒氛围感照片",
        "在街头，拍一组牵手走路的背影照"
      ]
    },
    love: {
      daily: [
        "给对方写一张暖心小纸条，偷偷放在对方的包里或者床头",
        "给对方泡一杯热饮，加上一个爱心形状的装饰",
        "帮对方按摩 10 分钟，缓解一天的疲劳",
        "偷偷把对方的手机壁纸换成你们的合照",
        "为对方准备一份简单的早餐，加上一个小惊喜"
      ],
      surprise: [
        "偷偷买一个对方最近提到过的小零食，放在对方的书桌前",
        "用对方的照片做一个简易拼图作为小礼物",
        "给对方录一段语音，分享今天你觉得他/她很可爱的瞬间",
        "为对方做一个专属的播放列表，包含对方喜欢的歌曲"
      ]
    },
    mood: {
      soft: [
        "在这个需要治愈的午后，去那家满是绿植的咖啡店吧。点一杯热可可，听那首你最爱的慢歌。点击发给Ta，让温暖翻倍？",
        "今天的心情适合看一场落日。带上相机，去江边或者天台，捕捉最后一道光辉。发给Ta，一起记录这温柔的时刻。"
      ],
      hungry: [
        "胃口大开的今天，唯有火锅不可辜负。去吃那家排队很久的牛油火锅吧，记得加一份你最爱的毛肚。发给Ta，开启投喂模式！",
        "现在的你一定很想吃一口甜的。那家新开的舒芙蕾就在附近，空气感的口感能瞬间点亮心情。发给Ta，让甜蜜发生。"
      ],
      date: [
        "今日约会灵感：去一家有live演出的餐吧，边吃边听歌。这里的灯光和音乐，最适合说一些真心话。点击发给Ta看看？",
        "想约会的心情藏不住了。去那个复古的私人影院吧，选一部你们都想看的经典老片，独享私密时光。发给Ta，立刻出发。"
      ],
      wander: [
        "阳光这么好，不去公园野餐可惜了。带上野餐垫和简单的水果，去草地上躺着发呆吧。发给Ta，一起去‘吸氧’。",
        "想出去走走？去那条梧桐树下的老街吧，看光影穿过叶缝。随机进一家设计感十足的小店，寻找惊喜。发给Ta，漫步出发。"
      ],
      record: [
        "今天的你很有表达欲，不如一起去拍一组‘默契大考验’照片吧。记录下彼此最专注或者最搞怪的瞬间。发给Ta，开始挑战。",
        "想留点回忆？去那个充满艺术气息的展览馆吧，在画作前留下你们的合影。每一张照片都是时间的注脚。发给Ta，去打卡。"
      ]
    },
    challenge: {
      guess_price: [
        "猜猜这顿饭一共花了多少钱？最接近答案的人可以点下一餐！",
        "盲猜这碗面多少钱？A. 28 B. 38 C. 48。答对解锁位置！"
      ],
      guess_taste: [
        "这道菜的辣度等级是多少？1-5星请出牌！猜错的人要喝三大口水哦。",
        "你觉得这杯饮料里加了几种配料？猜对有奖，猜错被投喂！"
      ]
    },
    poll: {
      reason: [
        "离家超近，走路5分钟即达，适合懒人约会。",
        "最近在社交媒体超级火，出片率100%，值得一去！",
        "环境安静，适合深度聊天，人均价格也很亲民。",
        "这里的招牌菜一绝，如果不去尝试一下真的会遗憾。"
      ]
    }
  };

  // 根据类型过滤内容
  if (contentLibrary[type]) {
    const categories = contentLibrary[type];
    
    // 逻辑：心情盲盒处理
    if (type === 'mood') {
        const moodCategory = prompt || 'soft';
        const items = categories[moodCategory] || categories['soft'];
        return items[Math.floor(Math.random() * items.length)];
    }

    let categoryKeys = Object.keys(categories);
    
    // 逻辑：关系感知过滤 (lover 倾向亲密话题, buddy 倾向基础/搭子话题)
    if (relationType === 'buddy' && type === 'chat') {
        categoryKeys = ['basic', 'buddy'];
    } else if (relationType === 'lover' && type === 'chat') {
        categoryKeys = ['basic', 'interactive', 'memory', 'deep'];
    }

    const randomCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    const items = categories[randomCategory];
    return items[Math.floor(Math.random() * items.length)];
  }

  return "今天也值得认真过。";
};

// --- API 路由实现 ---

// 1. 通用灵感生成
router.post('/generate', (req, res) => {
  const startTime = Date.now();
  try {
    const { type, relationType } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: '缺少 type 参数' });
    }
    const content = generateAIResponse(`生成 ${type}`, type, relationType);
    logger.info('🤖 AI 内容生成成功', { type, relationType, duration: `${Date.now() - startTime}ms` });
    res.json({ success: true, content });
  } catch (err) {
    logger.error('❌ AI 内容生成失败', { error: err.message });
    res.status(500).json({ success: false, error: '生成异常' });
  }
});

// 1.1 今日心情盲盒推荐
router.post('/mood-recommendation', (req, res) => {
  try {
    const { moodId, relationType } = req.body;
    if (!moodId) return res.status(400).json({ success: false, error: '缺少 moodId' });
    
    const content = generateAIResponse(moodId, 'mood', relationType);
    res.json({ 
      success: true, 
      data: {
        recommendation: content,
        moodId: moodId
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: '生成心情推荐故障' });
  }
});

// 1.2 投喂挑战题目生成
router.post('/challenge-questions', (req, res) => {
  try {
    const { foodName, relationType } = req.body;
    const content = generateAIResponse(foodName, 'challenge', relationType);
    res.json({ 
      success: true, 
      data: {
        question: content,
        foodName: foodName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: '生成挑战题目故障' });
  }
});

// 2. 美食图片生成 (带 COS 缓存)
router.post('/generate-image', async (req, res) => {
  try {
    const { foodName } = req.body;
    if (!foodName) return res.status(400).json({ success: false, error: '食物名缺失' });

    const exists = await checkImageExists(foodName);
    if (exists) return res.json({ success: true, url: getImageUrl(foodName), fromCache: true });

    // Mock 外部 AI 调用
    res.json({ 
      success: true, 
      url: 'https://via.placeholder.com/512?text=' + encodeURIComponent(foodName), 
      message: '图片正在生成中(本地审计 Mock)' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: '生成图片故障' });
  }
});

// 3. 美食攻略生成 (带 DB 缓存)
router.post('/generate-recipe', async (req, res) => {
  try {
    const { foodName } = req.body;
    if (!foodName) return res.status(400).json({ success: false, error: '食物名缺失' });

    const cached = await Recipe.findOne({ name: foodName });
    if (cached) return res.json({ success: true, recipe: cached.content, fromCache: true });

    const recipe = `【${foodName}】做法指南：1.准备食材... 2.开始烹饪... 3.完美出锅！`;
    await Recipe.create({ name: foodName, content: recipe });
    res.json({ success: true, recipe });
  } catch (err) {
    res.status(500).json({ success: false, error: '生成攻略故障' });
  }
});

module.exports = router;
