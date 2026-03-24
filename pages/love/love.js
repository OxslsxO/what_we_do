import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { syncRelationBadge } from '../../utils/relation-badge';
import { requestRelationSubscribe, requestActionSubscribe } from '../../utils/subscribe';

Page({
  data: {
    loading: true,
    loggedIn: false,
    userId: '',
    relation: null,
    pendingInvites: [],
    pendingActions: [],
    recentMemories: [],
    notificationSummary: {
      unreadCount: 0,
      recentNotifications: []
    },
    inviteForm: {
      relationType: 'lover',
      phone: '',
      anniversary: '',
      notes: ''
    },
    noteText: '',
    noteHistory: []
  },

  onShow() {
    const userId = getUserId();
    this.setData({
      loggedIn: isLoggedIn(),
      userId
    });
    this.loadRelationSpace();
  },

  onPullDownRefresh() {
    this.loadRelationSpace(() => wx.stopPullDownRefresh());
  },

  loadRelationSpace(done) {
    if (!this.data.loggedIn || !this.data.userId) {
      this.setData({
        loading: false,
        relation: null,
        pendingInvites: [],
        pendingActions: [],
        recentMemories: [],
        notificationSummary: {
          unreadCount: 0,
          recentNotifications: []
        }
      });
      syncRelationBadge(0);
      if (typeof done === 'function') done();
      return;
    }

    this.setData({ loading: true });

    api.getCurrentRelation(this.data.userId)
      .then((res) => {
        const data = res.data || {};
        this.setData({
          loading: false,
          relation: data.relation || null,
          pendingInvites: data.pendingInvites || [],
          pendingActions: data.pendingActions || [],
          recentMemories: data.recentMemories || [],
          notificationSummary: data.notificationSummary || {
            unreadCount: 0,
            recentNotifications: []
          },
          noteHistory: (data.pendingActions || [])
            .filter(a => a.type === 'love_note')
            .map(a => ({
              ...a,
              timeLabel: this.formatTime(a.createdAt)
            }))
        });
        syncRelationBadge((data.notificationSummary && data.notificationSummary.unreadCount) || 0);
        if (typeof done === 'function') done();
      })
      .catch(() => {
        this.setData({
          loading: false,
          notificationSummary: {
            unreadCount: 0,
            recentNotifications: []
          }
        });
        syncRelationBadge(0);
        wx.showToast({ title: '关系空间加载失败', icon: 'none' });
        if (typeof done === 'function') done();
      });
  },

  ensureLogin() {
    if (this.data.loggedIn) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  },

  selectRelationType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'inviteForm.relationType': type
    });
  },

  updateInviteForm(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`inviteForm.${field}`]: e.detail.value
    });
  },

  submitInvite() {
    if (!this.ensureLogin()) return;

    const { relationType, phone, anniversary, notes } = this.data.inviteForm;
    if (!phone) {
      wx.showToast({ title: '请输入对方手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '邀请发送中' });
    requestRelationSubscribe().then(() => {
      api.inviteRelation({
      userId: this.data.userId,
      relationType,
      phone,
      anniversary,
      notes
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '邀请已发送', icon: 'success' });
        this.setData({
          inviteForm: {
            relationType: 'lover',
            phone: '',
            anniversary: '',
            notes: ''
          }
        });
        this.loadRelationSpace();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '发送失败',
          icon: 'none'
        });
      });
    });
  },

  respondInvite(e) {
    const relationId = e.currentTarget.dataset.relationId;
    const decision = e.currentTarget.dataset.decision;

    wx.showLoading({ title: decision === 'accept' ? '正在接受' : '正在处理' });
    api.respondRelation({
      relationId,
      userId: this.data.userId,
      decision
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: decision === 'accept' ? '关系已建立' : '已拒绝邀请',
          icon: 'success'
        });
        this.loadRelationSpace();
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
    const responseChoice = e.currentTarget.dataset.choice || '';

    wx.showLoading({ title: decision === 'accept' ? '正在回应' : '正在婉拒' });
    requestActionSubscribe().then(() => {
      api.respondRelationAction({
      actionId,
      userId: this.data.userId,
      decision,
      responseChoice
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: decision === 'accept' ? '已回应' : '已处理',
          icon: 'success'
        });
        this.loadRelationSpace();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '回应失败',
          icon: 'none'
        });
      });
    });
  },

  completeAction(e) {
    const actionId = e.currentTarget.dataset.actionId;
    wx.showLoading({ title: '正在收进回忆' });
    api.completeRelationAction({
      actionId,
      userId: this.data.userId,
      templateType: 'done',
      summary: '这件今天的小事，已经被我们一起完成了。'
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已完成并记录', icon: 'success' });
        this.loadRelationSpace();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '完成失败',
          icon: 'none'
        });
      });
  },

  onNoteInput(e) {
    this.setData({ noteText: e.detail.value });
  },

  sendCustomNote() {
    if (!this.data.noteText.trim()) return;
    this.submitNote(this.data.noteText, 'text');
  },

  sendQuickNote(e) {
    const { text, action } = e.currentTarget.dataset;
    this.submitNote(text, action);
  },

  submitNote(content, actionType) {
    if (!this.data.relation) return;
    
    api.sendLoveNote({
      relationId: this.data.relation._id,
      userId: this.data.userId,
      content,
      action: actionType
    })
    .then(() => {
      wx.showToast({ title: '已传达到', icon: 'none' });
      this.setData({ noteText: '' });
      this.loadRelationSpace();
    })
    .catch(() => {
      wx.showToast({ title: '发送失败', icon: 'none' });
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  closeRelation() {
    if (!this.data.relation) return;

    wx.showModal({
      title: '解除关系',
      content: '解除后你们的关系将不再继续同步，但历史回忆仍会保留。',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '正在解除' });
        api.closeRelation({
          relationId: this.data.relation._id,
          userId: this.data.userId
        })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '关系已解除', icon: 'success' });
            this.loadRelationSpace();
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showToast({
              title: (err && err.message) || '解除失败',
              icon: 'none'
            });
          });
      }
    });
  },

  goToEat() {
    wx.navigateTo({ url: '/pages/eat/eat' });
  },

  goToPlay() {
    wx.navigateTo({ url: '/pages/play/play' });
  },

  goToPhoto() {
    wx.navigateTo({ url: '/pages/photo/photo' });
  },

  goToActivity() {
    wx.navigateTo({ url: '/pages/activity/activity' });
  },

  goToLaugh() {
    wx.navigateTo({ url: '/pages/laugh/laugh' });
  },

  goToChat() {
    wx.navigateTo({ url: '/pages/chat/chat' });
  },

  goToMemories() {
    wx.navigateTo({ url: '/pages/memories/memories' });
  },
  goToCircles() {
    wx.navigateTo({ url: '/pages/circles/index' });
  }
});
