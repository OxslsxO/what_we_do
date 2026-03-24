const express = require('express');
const mongoose = require('mongoose');
const Circle = require('../models/Circle');
const CircleInteraction = require('../models/CircleInteraction');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

function toObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

// 获取圈子列表
router.get('/list', async (req, res) => {
  try {
    const userId = toObjectId(req.query.userId);
    if (!userId) return res.status(400).json({ success: false, message: '缺少有效用户ID' });

    const circles = await Circle.find({
      status: 'active',
      'members.user': userId
    }).populate('members.user', 'userInfo.avatar userInfo.name');

    res.json({ success: true, data: circles });
  } catch (error) {
    logger.error('Get circles failed', error);
    res.status(500).json({ success: false, message: '加载圈子失败' });
  }
});

// 创建圈子
router.post('/create', async (req, res) => {
  try {
    const { name, type, userId } = req.body;
    const creatorId = toObjectId(userId);
    if (!creatorId) return res.status(400).json({ success: false, message: '无效创建者' });

    const circle = await Circle.create({
      name,
      type: type || 'custom',
      createdBy: creatorId,
      members: [{ user: creatorId, role: 'owner' }]
    });

    res.json({ success: true, data: circle });
  } catch (error) {
    logger.error('Create circle failed', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 加入圈子 (根据邀请链接)
router.post('/join', async (req, res) => {
  try {
    const { circleId, userId } = req.body;
    const cid = toObjectId(circleId);
    const uid = toObjectId(userId);

    const circle = await Circle.findById(cid);
    if (!circle) return res.status(404).json({ success: false, message: '圈子已失效' });

    if (circle.members.length >= 4) {
      return res.status(400).json({ success: false, message: '圈子已满员 (上限4人)' });
    }

    if (circle.members.some(m => m.user.toString() === uid.toString())) {
      return res.status(400).json({ success: false, message: '你已在圈子中' });
    }

    circle.members.push({ user: uid, role: 'member' });
    await circle.save();

    res.json({ success: true, data: circle });
  } catch (error) {
    logger.error('Join circle failed', error);
    res.status(500).json({ success: false, message: '加入失败' });
  }
});

// 连线互动 (Interaction)
router.post('/interact', async (req, res) => {
  try {
    const { circleId, fromUser, toUser, actionType } = req.body;
    const cid = toObjectId(circleId);
    const fid = toObjectId(fromUser);
    const tid = toObjectId(toUser);

    const interaction = await CircleInteraction.create({
      circleId: cid,
      fromUser: fid,
      toUsers: [tid],
      actionType: actionType || 'line_connect'
    });

    res.json({ success: true, data: interaction });
  } catch (error) {
    logger.error('Post interaction failed', error);
    res.status(500).json({ success: false, message: '互动失败' });
  }
});

// 获取圈子实时动态 (互动连线)
router.get('/interactions', async (req, res) => {
  try {
    const circleId = toObjectId(req.query.circleId);
    if (!circleId) return res.status(400).json({ success: false, message: '缺少圈子ID' });

    const interactions = await CircleInteraction.find({
      circleId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: interactions });
  } catch (error) {
    logger.error('Get interactions failed', error);
    res.status(500).json({ success: false, message: '加载动态失败' });
  }
});

// 往扭蛋机里扔愿望
router.post('/gacha/add', async (req, res) => {
  try {
    const { circleId, wish } = req.body;
    const cid = toObjectId(circleId);
    if (!wish) return res.status(400).json({ success: false, message: '写点什么吧' });

    const circle = await Circle.findByIdAndUpdate(cid, {
      $push: { gachaPool: wish }
    }, { new: true });

    res.json({ success: true, data: circle.gachaPool });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 抽取扭蛋 (全员可见结果)
router.post('/gacha/spin', async (req, res) => {
  try {
    const { circleId, userId } = req.body;
    const cid = toObjectId(circleId);
    const circle = await Circle.findById(cid);
    if (!circle || !circle.gachaPool.length) {
      return res.status(400).json({ success: false, message: '池子里空空如也' });
    }

    const result = circle.gachaPool[Math.floor(Math.random() * circle.gachaPool.length)];
    
    // 记录这次抽取作为一条 Interaction
    await CircleInteraction.create({
      circleId: cid,
      fromUser: toObjectId(userId),
      actionType: 'gacha_spin',
      metaData: { result }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '抽取失败' });
  }
});

module.exports = router;
