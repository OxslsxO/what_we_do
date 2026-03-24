const express = require('express');
const mongoose = require('mongoose');

const Relation = require('../models/Relation');
const RelationAction = require('../models/RelationAction');
const MemoryRecord = require('../models/MemoryRecord');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

const DEFAULT_AVATAR = 'https://img.icons8.com/ios-filled/100/000000/user.png';

function toObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

function getSafeUserInfo(userDoc = {}) {
  return userDoc.userInfo || {};
}

function getUserDisplay(userDoc, nickname = '') {
  const safeInfo = getSafeUserInfo(userDoc);
  return {
    _id: userDoc._id || '',
    phone: userDoc.phone || '',
    name: nickname || safeInfo.name || '今天的用户',
    avatar: safeInfo.avatar || DEFAULT_AVATAR,
    desc: safeInfo.desc || '',
    nickname: nickname || ''
  };
}

function getPartnerMember(relation, userId) {
  if (!relation || !Array.isArray(relation.members)) {
    return null;
  }

  return relation.members.find((member) => {
    const memberId =
      member && member.user && member.user._id ? member.user._id.toString() : String(member.user || '');
    return memberId !== String(userId);
  });
}

function getSelfMember(relation, userId) {
  if (!relation || !Array.isArray(relation.members)) {
    return null;
  }

  return relation.members.find((member) => {
    const memberId =
      member && member.user && member.user._id ? member.user._id.toString() : String(member.user || '');
    return memberId === String(userId);
  });
}

function formatRelation(relation, userId) {
  if (!relation) {
    return null;
  }

  const partnerMember = getPartnerMember(relation, userId);
  const selfMember = getSelfMember(relation, userId);

  return {
    _id: relation._id,
    type: relation.type,
    status: relation.status,
    anniversary: relation.anniversary || '',
    notes: relation.notes || '',
    commonAvoids: relation.commonAvoids || [],
    commonAddresses: relation.commonAddresses || [],
    stats: relation.stats || {},
    lastInteractionAt: relation.lastInteractionAt,
    createdAt: relation.createdAt,
    me: selfMember ? getUserDisplay(selfMember.user, selfMember.nickname) : null,
    partner: partnerMember ? getUserDisplay(partnerMember.user, partnerMember.nickname) : null
  };
}

function formatAction(action, currentUserId) {
  if (!action) {
    return null;
  }

  return {
    _id: action._id,
    relation: action.relation,
    module: action.module,
    type: action.type,
    status: action.status,
    title: action.title,
    summary: action.summary,
    message: action.message,
    payload: action.payload || {},
    responseChoice: action.responseChoice || '',
    responseMessage: action.responseMessage || '',
    respondedAt: action.respondedAt,
    completedAt: action.completedAt,
    createdAt: action.createdAt,
    initiator: getUserDisplay(action.initiator),
    receiver: getUserDisplay(action.receiver),
    isMine:
      action.initiator && action.initiator._id
        ? action.initiator._id.toString() === String(currentUserId)
        : false
  };
}

function formatMemory(memory) {
  if (!memory) {
    return null;
  }

  return {
    _id: memory._id,
    relation: memory.relation,
    action: memory.action,
    module: memory.module,
    templateType: memory.templateType,
    title: memory.title,
    summary: memory.summary,
    content: memory.content,
    mediaList: memory.mediaList || [],
    participants: (memory.participants || []).map((participant) => ({
      user: participant.user,
      nickname: participant.nickname || ''
    })),
    extra: memory.extra || {},
    createdAt: memory.createdAt
  };
}

function formatNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    _id: notification._id,
    user: notification.user,
    relation: notification.relation,
    action: notification.action,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    payload: notification.payload || {},
    isRead: !!notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

function buildGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，也可以先把今天想做的事轻轻放进明天。';
  if (hour < 11) return '早上好，今天也值得认真过。';
  if (hour < 14) return '中午到了，先把吃什么这件事解决掉。';
  if (hour < 18) return '下午适合安排一点让心情变好的事。';
  if (hour < 22) return '晚上是最适合发起“一起做点什么”的时候。';
  return '今天快结束了，也别忘了留下这一点回忆。';
}

function buildTodayRecommendations(formattedRelation) {
  const partnerName =
    formattedRelation && formattedRelation.partner && formattedRelation.partner.name
      ? formattedRelation.partner.name
      : 'TA';

  return [
    {
      module: 'eat',
      title: '今天吃点啥',
      summary: `给 ${partnerName} 发起一张“今天想吃这个”的卡片，看对方会不会回应你。`
    },
    {
      module: 'play',
      title: '今天玩点啥',
      summary: '如果今晚有空，就约一个 2 小时内能完成的小体验，让下班后的时间不只剩刷手机。'
    },
    {
      module: 'photo',
      title: '今天拍点啥',
      summary: '拍一张今天最有温度的画面，回忆就会在这一刻变得更具体。'
    },
    {
      module: 'activity',
      title: '今天做点啥',
      summary: '发起一个很轻的小任务，让关系不只是聊天，而是一起完成点什么。'
    }
  ];
}

async function getActiveRelation(userId) {
  return Relation.findOne({
    status: 'active',
    'members.user': userId
  }).populate('members.user', 'phone userInfo.avatar userInfo.name userInfo.desc userInfo.wechatOpenid');
}

async function getPendingRelations(userId) {
  return Relation.find({
    status: 'pending',
    'members.user': userId,
    invitedBy: { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .populate('members.user', 'phone userInfo.avatar userInfo.name userInfo.desc userInfo.wechatOpenid');
}

async function createNotification({
  user,
  relation = null,
  action = null,
  type = 'action_created',
  title = '',
  content = '',
  payload = {}
}) {
  const userObjectId = toObjectId(user);
  if (!userObjectId) {
    return null;
  }

  try {
    return await Notification.create({
      user: userObjectId,
      relation: relation || null,
      action: action || null,
      type,
      title,
      content,
      payload
    });
  } catch (error) {
    logger.error('Create notification failed', {
      message: error.message,
      stack: error.stack,
      user: String(user || ''),
      type
    });
    return null;
  }
}

async function getUnreadNotificationCount(userId) {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return 0;
  }

  return Notification.countDocuments({
    user: userObjectId,
    isRead: false
  });
}

async function getRecentNotifications(userId, limit = 6) {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return [];
  }

  return Notification.find({ user: userObjectId })
    .sort({ createdAt: -1 })
    .limit(limit);
}

async function buildNotificationSummary(userId) {
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(userId),
    getRecentNotifications(userId, 5)
  ]);

  return {
    unreadCount,
    recentNotifications: recentNotifications.map(formatNotification)
  };
}

router.post('/invite', async (req, res) => {
  try {
    const { userId, phone, relationType = 'lover', nickname = '', anniversary = '', notes = '' } = req.body;
    const initiatorId = toObjectId(userId);

    if (!initiatorId) {
      return res.status(400).json({ success: false, message: '缺少有效的发起人。' });
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: '请输入对方手机号。' });
    }

    const [initiator, target] = await Promise.all([
      User.findById(initiatorId),
      User.findOne({ phone })
    ]);

    if (!initiator) {
      return res.status(404).json({ success: false, message: '发起人不存在。' });
    }

    if (!target) {
      return res.status(404).json({ success: false, message: '未找到这个手机号对应的用户。' });
    }

    if (initiator._id.toString() === target._id.toString()) {
      return res.status(400).json({ success: false, message: '不能邀请自己建立关系。' });
    }

    const existingRelation = await Relation.findOne({
      status: { $in: ['pending', 'active', 'paused'] },
      'members.user': { $all: [initiator._id, target._id] }
    });

    if (existingRelation) {
      return res.status(409).json({ success: false, message: '你们之间已经存在待处理或生效中的关系。' });
    }

    const relation = await Relation.create({
      type: relationType,
      status: 'pending',
      invitedBy: initiator._id,
      anniversary,
      notes,
      members: [
        {
          user: initiator._id,
          nickname: getSafeUserInfo(initiator).name || ''
        },
        {
          user: target._id,
          nickname: nickname || getSafeUserInfo(target).name || ''
        }
      ]
    });

    await createNotification({
      user: target._id,
      relation: relation._id,
      type: 'relation_invite',
      title: `${getSafeUserInfo(initiator).name || '有人'} 向你发来关系邀请`,
      content:
        relationType === 'lover'
          ? '对方想和你建立恋人关系，确认后你们就可以开始一起发起今天的小事。'
          : relationType === 'buddy'
            ? '对方想和你成为搭子，确认后就能一起发起吃喝玩乐和小任务。'
            : '对方想和你建立更亲近的好友关系，确认后就能同步互动和回忆。',
      payload: {
        relationType,
        initiatorId: initiator._id
      }
    });

    const populatedRelation = await Relation.findById(relation._id).populate(
      'members.user',
      'phone userInfo.avatar userInfo.name userInfo.desc userInfo.wechatOpenid'
    );

    logger.info('Relation invite created', {
      relationId: relation._id,
      initiatorId: initiator._id,
      targetId: target._id,
      type: relationType
    });

    res.json({
      success: true,
      data: {
        relation: formatRelation(populatedRelation, initiator._id)
      }
    });
  } catch (error) {
    logger.error('Relation invite failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '发起关系邀请失败。', error: error.message });
  }
});

router.post('/respond', async (req, res) => {
  try {
    const { relationId, userId, decision = 'accept', nickname = '' } = req.body;
    const relationObjectId = toObjectId(relationId);
    const userObjectId = toObjectId(userId);

    if (!relationObjectId || !userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的关系或用户信息。' });
    }

    const relation = await Relation.findById(relationObjectId);
    if (!relation) {
      return res.status(404).json({ success: false, message: '关系不存在。' });
    }

    const member = relation.members.find((item) => item.user.toString() === userObjectId.toString());
    if (!member) {
      return res.status(403).json({ success: false, message: '你不在这个关系中。' });
    }

    if (relation.status !== 'pending') {
      return res.status(400).json({ success: false, message: '当前关系已经处理过了。' });
    }

    if (nickname) {
      member.nickname = nickname;
    }

    if (decision === 'accept') {
      relation.status = 'active';
      relation.lastInteractionAt = new Date();
      relation.stats.lastActionAt = new Date();
      await User.updateMany(
        { _id: { $in: relation.members.map((item) => item.user) } },
        { $inc: { 'userInfo.friends': 1 } }
      );
    } else {
      relation.status = 'closed';
    }

    await relation.save();

    const initiatorMember = relation.members.find(
      (item) => item.user.toString() === relation.invitedBy.toString()
    );
    const responderMember = relation.members.find(
      (item) => item.user.toString() === userObjectId.toString()
    );

    await createNotification({
      user: relation.invitedBy,
      relation: relation._id,
      type: decision === 'accept' ? 'relation_accept' : 'relation_decline',
      title:
        decision === 'accept'
          ? `${(responderMember && responderMember.nickname) || 'TA'} 接受了你的关系邀请`
          : `${(responderMember && responderMember.nickname) || 'TA'} 暂时没有接受邀请`,
      content:
        decision === 'accept'
          ? '关系已经建立成功，接下来你们可以开始一起发起今天的小事了。'
          : '这次关系邀请没有建立成功，你仍然可以稍后重新发起。',
      payload: {
        relationType: relation.type,
        initiatorName: initiatorMember ? initiatorMember.nickname || '' : '',
        responderName: responderMember ? responderMember.nickname || '' : ''
      }
    });

    const populatedRelation = await Relation.findById(relation._id).populate(
      'members.user',
      'phone userInfo.avatar userInfo.name userInfo.desc userInfo.wechatOpenid'
    );

    res.json({
      success: true,
      data: {
        relation: formatRelation(populatedRelation, userObjectId),
        decision
      }
    });
  } catch (error) {
    logger.error('Relation respond failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '处理关系邀请失败。', error: error.message });
  }
});

router.post('/close', async (req, res) => {
  try {
    const { relationId, userId } = req.body;
    const relationObjectId = toObjectId(relationId);
    const userObjectId = toObjectId(userId);

    if (!relationObjectId || !userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的关系或用户信息。' });
    }

    const relation = await Relation.findById(relationObjectId);
    if (!relation) {
      return res.status(404).json({ success: false, message: '关系不存在。' });
    }

    const isMember = relation.members.some((item) => item.user.toString() === userObjectId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: '你不能解除这个关系。' });
    }

    relation.status = 'closed';
    await relation.save();

    const partnerMember = relation.members.find((item) => item.user.toString() !== userObjectId.toString());
    await createNotification({
      user: partnerMember ? partnerMember.user : null,
      relation: relation._id,
      type: 'relation_closed',
      title: '一段关系同步已结束',
      content: '对方结束了这段关系同步，历史回忆仍会继续保留。',
      payload: {
        closedBy: userObjectId
      }
    });

    res.json({ success: true, message: '关系已解除。' });
  } catch (error) {
    logger.error('Relation close failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '解除关系失败。', error: error.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const userObjectId = toObjectId(req.query.userId);
    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    const relation = await getActiveRelation(userObjectId);
    const pendingRelations = await getPendingRelations(userObjectId);
    const formattedRelation = formatRelation(relation, userObjectId);

    const [pendingActions, recentMemories, notificationSummary] = await Promise.all([
      relation
        ? RelationAction.find({
            relation: relation._id,
            status: { $in: ['pending', 'accepted'] }
          })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
            .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc')
        : [],
      relation ? MemoryRecord.find({ relation: relation._id }).sort({ createdAt: -1 }).limit(6) : [],
      buildNotificationSummary(userObjectId)
    ]);

    res.json({
      success: true,
      data: {
        relation: formattedRelation,
        pendingInvites: pendingRelations.map((item) => formatRelation(item, userObjectId)),
        pendingActions: pendingActions.map((item) => formatAction(item, userObjectId)),
        recentMemories: recentMemories.map(formatMemory),
        notificationSummary
      }
    });
  } catch (error) {
    logger.error('Get current relation failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取关系信息失败。', error: error.message });
  }
});

router.get('/timeline', async (req, res) => {
  try {
    const userObjectId = toObjectId(req.query.userId);
    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    const relation = await getActiveRelation(userObjectId);
    if (!relation) {
      return res.json({
        success: true,
        data: {
          relation: null,
          actions: [],
          memories: [],
          notificationSummary: {
            unreadCount: 0,
            recentNotifications: []
          }
        }
      });
    }

    const [actions, memories, notificationSummary] = await Promise.all([
      RelationAction.find({ relation: relation._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
        .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc'),
      MemoryRecord.find({ relation: relation._id }).sort({ createdAt: -1 }).limit(20),
      buildNotificationSummary(userObjectId)
    ]);

    res.json({
      success: true,
      data: {
        relation: formatRelation(relation, userObjectId),
        actions: actions.map((item) => formatAction(item, userObjectId)),
        memories: memories.map(formatMemory),
        notificationSummary
      }
    });
  } catch (error) {
    logger.error('Get relation timeline failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取关系时间线失败。', error: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const userObjectId = toObjectId(req.query.userId);
    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    const relation = await getActiveRelation(userObjectId);
    const formattedRelation = formatRelation(relation, userObjectId);

    const [pendingActions, recentMemories, notificationSummary] = await Promise.all([
      relation
        ? RelationAction.find({
            relation: relation._id,
            status: { $in: ['pending', 'accepted'] }
          })
            .sort({ createdAt: -1 })
            .limit(4)
            .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
            .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc')
        : [],
      relation ? MemoryRecord.find({ relation: relation._id }).sort({ createdAt: -1 }).limit(4) : [],
      buildNotificationSummary(userObjectId)
    ]);

    res.json({
      success: true,
      data: {
        greeting: buildGreeting(),
        relation: formattedRelation,
        pendingActions: pendingActions.map((item) => formatAction(item, userObjectId)),
        recentMemories: recentMemories.map(formatMemory),
        todayRecommendations: buildTodayRecommendations(formattedRelation),
        quickStats: {
          actionsCount: (formattedRelation && formattedRelation.stats && formattedRelation.stats.actionsCount) || 0,
          completedCount:
            (formattedRelation && formattedRelation.stats && formattedRelation.stats.completedCount) || 0,
          memoryCount: (formattedRelation && formattedRelation.stats && formattedRelation.stats.memoryCount) || 0
        },
        notificationSummary
      }
    });
  } catch (error) {
    logger.error('Get relation dashboard failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取今日面板失败。', error: error.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const userObjectId = toObjectId(req.query.userId);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));

    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    const query = { user: userObjectId };
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userObjectId, isRead: false })
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(formatNotification),
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get notifications failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取通知失败。', error: error.message });
  }
});

router.post('/notification/read', async (req, res) => {
  try {
    const { notificationId, userId } = req.body;
    const notificationObjectId = toObjectId(notificationId);
    const userObjectId = toObjectId(userId);

    if (!notificationObjectId || !userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的通知或用户信息。' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationObjectId, user: userObjectId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: '通知不存在。' });
    }

    const unreadCount = await getUnreadNotificationCount(userObjectId);

    res.json({
      success: true,
      data: {
        notification: formatNotification(notification),
        unreadCount
      }
    });
  } catch (error) {
    logger.error('Read notification failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '标记通知已读失败。', error: error.message });
  }
});

router.post('/notification/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    const userObjectId = toObjectId(userId);

    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    await Notification.updateMany(
      { user: userObjectId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      data: {
        unreadCount: 0
      }
    });
  } catch (error) {
    logger.error('Read all notifications failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '全部标记已读失败。', error: error.message });
  }
});

router.get('/memories', async (req, res) => {
  try {
    const userObjectId = toObjectId(req.query.userId);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const moduleFilter = String(req.query.module || '').trim();

    if (!userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的用户信息。' });
    }

    const relation = await getActiveRelation(userObjectId);
    if (!relation) {
      return res.json({
        success: true,
        data: {
          relation: null,
          memories: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        }
      });
    }

    const query = { relation: relation._id };
    if (moduleFilter) {
      query.module = moduleFilter;
    }

    const [memories, total] = await Promise.all([
      MemoryRecord.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MemoryRecord.countDocuments(query)
    ]);
    res.json({
      success: true,
      data: {
        relation: formatRelation(relation, userObjectId),
        memories: memories.map(formatMemory),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get memories failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '获取回忆列表失败。', error: error.message });
  }
});

/**
 * 玩法五：爱的小纸条
 * 快速创建轻量级互动
 */
router.post('/note', async (req, res) => {
  try {
    const { relationId, userId, content, action = 'pinch' } = req.body;
    const relationObjectId = toObjectId(relationId);
    const userObjectId = toObjectId(userId);

    if (!relationObjectId || !userObjectId || !content) {
      return res.status(400).json({ success: false, message: '缺少必要参数。' });
    }

    const relation = await Relation.findById(relationObjectId);
    if (!relation || relation.status !== 'active') {
      return res.status(404).json({ success: false, message: '关系未激活。' });
    }

    const receiverMember = relation.members.find((m) => m.user.toString() !== userObjectId.toString());
    const initiatorMember = relation.members.find((m) => m.user.toString() === userObjectId.toString());

    const noteAction = await RelationAction.create({
      relation: relation._id,
      initiator: userObjectId,
      receiver: receiverMember.user,
      module: 'daily',
      type: 'love_note',
      status: 'done', // 小纸条即时完成
      title: '爱的小纸条',
      message: content,
      payload: { action }
    });

    await createNotification({
      user: receiverMember.user,
      relation: relation._id,
      action: noteAction._id,
      type: 'love_note',
      title: `${initiatorMember.nickname || '对方'} 给你发了张小纸条`,
      content: content
    });

    res.json({ success: true, data: { action: formatAction(noteAction, userObjectId) } });
  } catch (error) {
    res.status(500).json({ success: false, message: '发送小纸条失败。' });
  }
});

/**
 * 玩法三：约会投票
 * 更新投票状态
 */
router.post('/action/vote', async (req, res) => {
  try {
    const { actionId, userId, optionIndex } = req.body;
    const action = await RelationAction.findById(actionId);
    if (!action || action.type !== 'date_poll') {
      return res.status(404).json({ success: false, message: '投票动作不存在。' });
    }

    if (!action.payload.options || !action.payload.options[optionIndex]) {
      return res.status(400).json({ success: false, message: '无效的选项。' });
    }

    // 记录谁投了哪一票
    const votes = action.payload.votes || {};
    votes[userId] = optionIndex;
    
    // 更新选项票数
    const newOptions = action.payload.options.map((opt, idx) => {
      const count = Object.values(votes).filter(v => v === idx).length;
      return { ...opt, votes: count };
    });

    action.payload = { ...action.payload, options: newOptions, votes };
    
    // 如果双方都投完票了（假设是双人关系）
    const totalVotes = Object.keys(votes).length;
    if (totalVotes >= 2) {
      action.status = 'accepted';
      // 计算最高票（简单逻辑：取第一个最高票）
      const winner = [...newOptions].sort((a, b) => b.votes - a.votes)[0];
      action.summary = `投票完成！最终选择了：${winner.name}`;
    }

    await action.save();
    res.json({ success: true, data: { action: formatAction(action, userId) } });
  } catch (error) {
    res.status(500).json({ success: false, message: '投票失败。' });
  }
});

router.post('/action', async (req, res) => {
  try {
    const {
      relationId,
      initiatorId,
      module = 'eat',
      type = 'eat_share',
      title = '',
      summary = '',
      message = '',
      payload = {}
    } = req.body;

    const relationObjectId = toObjectId(relationId);
    const initiatorObjectId = toObjectId(initiatorId);

    if (!relationObjectId || !initiatorObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的关系或发起人。' });
    }

    const relation = await Relation.findById(relationObjectId);
    if (!relation || relation.status !== 'active') {
      return res.status(404).json({ success: false, message: '当前没有可用的关系。' });
    }

    const initiatorMember = relation.members.find((item) => item.user.toString() === initiatorObjectId.toString());
    if (!initiatorMember) {
      return res.status(403).json({ success: false, message: '你不能在这个关系里发起动作。' });
    }

    const receiverMember = relation.members.find((item) => item.user.toString() !== initiatorObjectId.toString());
    if (!receiverMember) {
      return res.status(400).json({ success: false, message: '当前关系缺少接收方。' });
    }

    const action = await RelationAction.create({
      relation: relation._id,
      initiator: initiatorObjectId,
      receiver: receiverMember.user,
      module,
      type,
      title,
      summary,
      message,
      payload
    });

    relation.stats.actionsCount = (relation.stats.actionsCount || 0) + 1;
    relation.stats.lastActionAt = new Date();
    relation.lastInteractionAt = new Date();
    await relation.save();

    await createNotification({
      user: receiverMember.user,
      relation: relation._id,
      action: action._id,
      type: 'action_created',
      title: '你收到一个新的关系动作',
      content: summary || message || title || '有人向你发起了今天的小事，等你回应。',
      payload: {
        module,
        actionType: type,
        initiatorId: initiatorObjectId
      }
    });

    const populatedAction = await RelationAction.findById(action._id)
      .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
      .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc');

    res.json({
      success: true,
      data: {
        action: formatAction(populatedAction, initiatorObjectId)
      }
    });
  } catch (error) {
    logger.error('Create relation action failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '发起动作失败。', error: error.message });
  }
});

router.post('/action/respond', async (req, res) => {
  try {
    const { actionId, userId, decision = 'accept', responseChoice = '', responseMessage = '' } = req.body;
    const actionObjectId = toObjectId(actionId);
    const userObjectId = toObjectId(userId);

    if (!actionObjectId || !userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的动作或用户信息。' });
    }

    const action = await RelationAction.findById(actionObjectId);
    if (!action) {
      return res.status(404).json({ success: false, message: '动作不存在。' });
    }

    if (action.receiver.toString() !== userObjectId.toString()) {
      return res.status(403).json({ success: false, message: '只有接收方可以回应这个动作。' });
    }

    if (!['pending', 'accepted'].includes(action.status)) {
      return res.status(400).json({ success: false, message: '当前动作已经处理过了。' });
    }

    action.status = decision === 'accept' ? 'accepted' : 'declined';
    action.responseChoice = responseChoice;
    action.responseMessage = responseMessage;
    action.respondedAt = new Date();
    await action.save();

    await Relation.findByIdAndUpdate(action.relation, {
      $set: { lastInteractionAt: new Date(), 'stats.lastActionAt': new Date() }
    });

    await createNotification({
      user: action.initiator,
      relation: action.relation,
      action: action._id,
      type: decision === 'accept' ? 'action_accepted' : 'action_declined',
      title: decision === 'accept' ? '你的动作被回应了' : '你的动作被婉拒了',
      content:
        decision === 'accept'
          ? responseMessage || '对方已经接受了这次动作，接下来可以继续推进或完成它。'
          : responseMessage || '这次动作暂时没有被接受，可以稍后换一种方式再发起。',
      payload: {
        responseChoice,
        decision
      }
    });

    const populatedAction = await RelationAction.findById(action._id)
      .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
      .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc');

    res.json({
      success: true,
      data: {
        action: formatAction(populatedAction, userObjectId)
      }
    });
  } catch (error) {
    logger.error('Respond relation action failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '回应动作失败。', error: error.message });
  }
});

router.post('/action/complete', async (req, res) => {
  try {
    const {
      actionId,
      userId,
      notes = '',
      content = '',
      templateType = 'done',
      mediaList = [],
      title = '',
      summary = ''
    } = req.body;

    const actionObjectId = toObjectId(actionId);
    const userObjectId = toObjectId(userId);

    if (!actionObjectId || !userObjectId) {
      return res.status(400).json({ success: false, message: '缺少有效的动作或用户信息。' });
    }

    const action = await RelationAction.findById(actionObjectId);
    if (!action) {
      return res.status(404).json({ success: false, message: '动作不存在。' });
    }

    const relation = await Relation.findById(action.relation).populate(
      'members.user',
      'phone userInfo.avatar userInfo.name userInfo.desc userInfo.wechatOpenid'
    );
    if (!relation) {
      return res.status(404).json({ success: false, message: '关系不存在。' });
    }

    const isMember = relation.members.some((item) => item.user._id.toString() === userObjectId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: '你不能完成这个动作。' });
    }

    const existingMemory = await MemoryRecord.findOne({ action: action._id });
    if (action.status === 'done' && existingMemory) {
      const populatedDoneAction = await RelationAction.findById(action._id)
        .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
        .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc');

      return res.json({
        success: true,
        data: {
          action: formatAction(populatedDoneAction, userObjectId),
          memory: formatMemory(existingMemory)
        }
      });
    }

    action.status = 'done';
    action.completedAt = new Date();
    await action.save();

    let memory = existingMemory;
    let createdMemory = false;

    if (!memory) {
      memory = await MemoryRecord.create({
        relation: relation._id,
        action: action._id,
        createdBy: userObjectId,
        module: action.module,
        templateType,
        title: title || action.title || '我们又完成了一件小事',
        summary: summary || action.summary || notes || '今天的互动已经被记下来。',
        content: content || action.message || notes,
        mediaList: Array.isArray(mediaList) ? mediaList : [],
        participants: relation.members.map((item) => ({
          user: item.user._id,
          nickname: item.nickname || getSafeUserInfo(item.user).name || ''
        })),
        extra: {
          actionType: action.type,
          payload: action.payload || {},
          notes
        }
      });
      createdMemory = true;
    }

    relation.stats.completedCount = (relation.stats.completedCount || 0) + 1;
    if (createdMemory) {
      relation.stats.memoryCount = (relation.stats.memoryCount || 0) + 1;
    }
    relation.stats.lastActionAt = new Date();
    relation.lastInteractionAt = new Date();
    await relation.save();

    const otherMember = relation.members.find((item) => item.user._id.toString() !== userObjectId.toString());
    await createNotification({
      user: otherMember ? otherMember.user._id : null,
      relation: relation._id,
      action: action._id,
      type: 'action_completed',
      title: '一条关系动作已经完成',
      content: summary || action.summary || '这件今天的小事已经被完成，也被记录成了回忆。',
      payload: {
        memoryId: memory._id,
        templateType
      }
    });

    const populatedAction = await RelationAction.findById(action._id)
      .populate('initiator', 'phone userInfo.avatar userInfo.name userInfo.desc')
      .populate('receiver', 'phone userInfo.avatar userInfo.name userInfo.desc');

    res.json({
      success: true,
      data: {
        action: formatAction(populatedAction, userObjectId),
        memory: formatMemory(memory)
      }
    });
  } catch (error) {
    logger.error('Complete relation action failed', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '完成动作失败。', error: error.message });
  }
});

module.exports = router;
