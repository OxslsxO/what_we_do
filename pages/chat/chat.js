import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { syncRelationBadge } from '../../utils/relation-badge';

Page({
  data: {
    loading: true,
    relation: null,
    pendingInvites: [],
    pendingActions: [],
    memories: [],
    notifications: [],
    unreadCount: 0,
    notificationPage: 1,
    notificationLimit: 20,
    hasMoreNotifications: true,
    loadingMore: false
  },

  formatRelativeTime(value) {
    if (!value) return '刚刚';
    const now = Date.now();
    const time = new Date(value).getTime();
    const diff = now - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
    if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
    return `${Math.max(1, Math.floor(diff / day))} 天前`;
  },

  normalizeNotification(item) {
    return {
      ...item,
      createdAtText: this.formatRelativeTime(item.createdAt)
    };
  },

  onShow() {
    this.loadMessageCenter();
  },

  onPullDownRefresh() {
    this.loadMessageCenter(() => wx.stopPullDownRefresh());
  },

  loadMessageCenter(done) {
    const userId = getUserId();
    if (!isLoggedIn() || !userId) {
      wx.navigateTo({ url: '/pages/login/login' });
      syncRelationBadge(0);
      if (typeof done === 'function') done();
      return;
    }

    this.setData({ loading: true, notificationPage: 1 });

    Promise.all([
      api.getCurrentRelation(userId),
      api.getRelationTimeline(userId),
      api.getRelationNotifications(userId, {
        page: 1,
        limit: this.data.notificationLimit
      })
    ])
      .then(([currentRes, timelineRes, notificationRes]) => {
        const currentData = currentRes.data || {};
        const timelineData = timelineRes.data || {};
        const notificationData = notificationRes.data || {};
        const notifications = (notificationData.notifications || []).map((item) =>
          this.normalizeNotification(item)
        );
        const unreadCount = notificationData.unreadCount || 0;

        this.setData({
          loading: false,
          relation: currentData.relation || timelineData.relation || null,
          pendingInvites: currentData.pendingInvites || [],
          pendingActions: currentData.pendingActions || [],
          memories: timelineData.memories || [],
          notifications,
          unreadCount,
          notificationPage: 2,
          hasMoreNotifications: notifications.length === this.data.notificationLimit
        });
        syncRelationBadge(unreadCount);
        if (typeof done === 'function') done();
      })
      .catch(() => {
        this.setData({ loading: false });
        syncRelationBadge(0);
        wx.showToast({ title: '消息中心加载失败', icon: 'none' });
        if (typeof done === 'function') done();
      });
  },

  loadMoreNotifications() {
    const userId = getUserId();
    if (!userId || this.data.loadingMore || !this.data.hasMoreNotifications) return;

    this.setData({ loadingMore: true });

    api
      .getRelationNotifications(userId, {
        page: this.data.notificationPage,
        limit: this.data.notificationLimit
      })
      .then((res) => {
        const data = res.data || {};
        const nextNotifications = (data.notifications || []).map((item) =>
          this.normalizeNotification(item)
        );

        this.setData({
          notifications: this.data.notifications.concat(nextNotifications),
          notificationPage: this.data.notificationPage + 1,
          hasMoreNotifications: nextNotifications.length === this.data.notificationLimit,
          loadingMore: false,
          unreadCount: data.unreadCount || this.data.unreadCount
        });
        syncRelationBadge(data.unreadCount || this.data.unreadCount);
      })
      .catch(() => {
        this.setData({ loadingMore: false });
        wx.showToast({ title: '更多通知加载失败', icon: 'none' });
      });
  },

  respondInvite(e) {
    const relationId = e.currentTarget.dataset.relationId;
    const decision = e.currentTarget.dataset.decision;
    wx.showLoading({ title: decision === 'accept' ? '正在接受' : '正在处理' });
    api
      .respondRelation({
        relationId,
        userId: getUserId(),
        decision
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: decision === 'accept' ? '关系已建立' : '已拒绝邀请',
          icon: 'success'
        });
        this.loadMessageCenter();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '处理失败',
          icon: 'none'
        });
      });
  },

  respondAction(e) {
    const actionId = e.currentTarget.dataset.actionId;
    const decision = e.currentTarget.dataset.decision;
    wx.showLoading({ title: decision === 'accept' ? '正在回应' : '正在处理' });
    api
      .respondRelationAction({
        actionId,
        userId: getUserId(),
        decision
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已处理', icon: 'success' });
        this.loadMessageCenter();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '处理失败',
          icon: 'none'
        });
      });
  },

  completeAction(e) {
    const actionId = e.currentTarget.dataset.actionId;
    const action = this.data.pendingActions.find(a => a._id === actionId);
    
    wx.showLoading({ title: '正在完成' });
    api.completeRelationAction({
        actionId,
        userId: getUserId(),
        templateType: 'done',
        summary: '这次动作已经在消息中心被标记为完成，并沉淀成了回忆。'
      })
      .then(() => {
        wx.hideLoading();
        wx.showModal({
          title: '已完成！🎉',
          content: '这件小事已经收进回忆了。要不要一键打卡分享到社区，记录这个瞬间？',
          confirmText: '去分享',
          cancelText: '不用了',
          success: (res) => {
            if (res.confirm) {
              const draft = {
                module: '我们完成了',
                sourceModule: action ? action.module : 'daily',
                templateType: 'done',
                title: action ? action.title : '一项共同完成',
                content: action ? (action.summary || action.message) : '',
                relationId: this.data.relation ? this.data.relation._id : '',
                actionId: actionId,
                tags: ['我们完成了', action ? action.module : '日常']
              };
              wx.setStorageSync('publish_draft', draft);
              wx.navigateTo({ url: '/pages/publish/publish' });
            }
          }
        });
        this.loadMessageCenter();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '完成失败',
          icon: 'none'
        });
      });
  },

  handleVote(e) {
    const { actionId, index } = e.currentTarget.dataset;
    api.voteAction({
      actionId,
      userId: getUserId(),
      optionIndex: index
    })
    .then(() => {
      wx.showToast({ title: '投票成功', icon: 'none' });
      this.loadMessageCenter();
    })
    .catch(err => {
      wx.showToast({ title: err.message || '投票失败', icon: 'none' });
    });
  },

  markNotificationRead(e) {
    const notificationId = e.currentTarget.dataset.notificationId;
    if (!notificationId) return;

    api
      .readRelationNotification({
        notificationId,
        userId: getUserId()
      })
      .then((res) => {
        const unreadCount = (res.data && res.data.unreadCount) || 0;
        const notifications = this.data.notifications.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true
              }
            : item
        );

        this.setData({
          notifications,
          unreadCount
        });
        syncRelationBadge(unreadCount);
      })
      .catch(() => {
        wx.showToast({ title: '标记失败', icon: 'none' });
      });
  },

  markAllRead() {
    if (!this.data.unreadCount) return;

    wx.showLoading({ title: '正在处理' });
    api
      .readAllRelationNotifications({
        userId: getUserId()
      })
      .then(() => {
        wx.hideLoading();
        this.setData({
          unreadCount: 0,
          notifications: this.data.notifications.map((item) => ({
            ...item,
            isRead: true
          }))
        });
        syncRelationBadge(0);
        wx.showToast({ title: '已全部标记已读', icon: 'success' });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '处理失败', icon: 'none' });
      });
  },

  openMemoryWall() {
    wx.navigateTo({ url: '/pages/memories/memories' });
  },

  goToRelation() {
    wx.switchTab({ url: '/pages/love/love' });
  }
});
