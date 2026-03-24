import { api } from '../../utils/api';
import { getStoredUser, getUserId, getUserInfo, isLoggedIn } from '../../utils/user';
import { syncRelationBadge } from '../../utils/relation-badge';

const DEFAULT_RECOMMENDATIONS = [
  {
    module: 'eat',
    title: '今天吃点啥',
    summary: '先解决今天最重要的一件小事，吃到对的东西，整天状态都会更好。'
  },
  {
    module: 'play',
    title: '今天玩点啥',
    summary: '找一个 2 小时内能完成的小快乐，让今天不只是上班和回家。'
  },
  {
    module: 'photo',
    title: '今天拍点啥',
    summary: '给今天留下一张可以反复翻看的画面，回忆会慢慢变得很具体。'
  }
];

const MOOD_OPTIONS = [
  { id: 'soft', emoji: '☀️', label: '想被治愈' },
  { id: 'hungry', emoji: '🍜', label: '急需吃顿好的' },
  { id: 'date', emoji: '💫', label: '适合约会' },
  { id: 'wander', emoji: '🌿', label: '想出去走走' },
  { id: 'record', emoji: '📷', label: '想留点回忆' }
];

Page({
  data: {
    loading: true,
    loggedIn: false,
    userInfo: {},
    userId: '',
    dateText: '',
    greeting: '今天也值得认真过。',
    selectedMood: '',
    moodOptions: MOOD_OPTIONS,
    relation: null,
    pendingActions: [],
    recentMemories: [],
    todayRecommendations: DEFAULT_RECOMMENDATIONS,
    notificationSummary: {
      unreadCount: 0,
      recentNotifications: []
    },
    quickStats: {
      actionsCount: 0,
      completedCount: 0,
      memoryCount: 0
    },
    showInviteModal: false,
    inviteForm: {
      relationType: 'lover',
      phone: '',
      anniversary: '',
      notes: ''
    },
    showMoodModal: false,
    moodRecommendation: null,
    isGeneratingMood: false
  },

  onShow() {
    this.setData({
      dateText: this.formatDateText(),
      selectedMood: wx.getStorageSync('todayMood') || ''
    });
    this.bootstrapPage();
  },

  formatDateText() {
    const now = new Date();
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${now.getMonth() + 1}月${now.getDate()}日 ${weekMap[now.getDay()]}`;
  },

  bootstrapPage() {
    const loggedIn = isLoggedIn();
    const userId = getUserId();
    const userInfo = getUserInfo();

    this.setData({
      loggedIn,
      userId,
      userInfo,
      loading: !!loggedIn
    });

    if (!loggedIn || !userId) {
      this.setData({
        loading: false,
        relation: null,
        pendingActions: [],
        recentMemories: [],
        todayRecommendations: DEFAULT_RECOMMENDATIONS,
        notificationSummary: {
          unreadCount: 0,
          recentNotifications: []
        }
      });
      syncRelationBadge(0);
      return;
    }

    this.loadDashboard();
  },

  loadDashboard() {
    const userId = this.data.userId;
    api.getRelationDashboard(userId)
      .then((res) => {
        const data = res.data || {};
        this.setData({
          loading: false,
          greeting: data.greeting || '今天也值得认真过。',
          relation: data.relation || null,
          pendingActions: data.pendingActions || [],
          recentMemories: data.recentMemories || [],
          todayRecommendations: data.todayRecommendations || DEFAULT_RECOMMENDATIONS,
          notificationSummary: data.notificationSummary || {
            unreadCount: 0,
            recentNotifications: []
          },
          quickStats: data.quickStats || {
            actionsCount: 0,
            completedCount: 0,
            memoryCount: 0
          }
        });
        syncRelationBadge((data.notificationSummary && data.notificationSummary.unreadCount) || 0);
      })
      .catch(() => {
        this.setData({
          loading: false,
          relation: null,
          pendingActions: [],
          recentMemories: [],
          todayRecommendations: DEFAULT_RECOMMENDATIONS,
          notificationSummary: {
            unreadCount: 0,
            recentNotifications: []
          }
        });
        syncRelationBadge(0);
        wx.showToast({ title: '今日面板加载失败', icon: 'none' });
      });
  },

  selectMood(e) {
    const moodId = e.currentTarget.dataset.id;
    if (this.data.isGeneratingMood) return;
    
    this.setData({ 
      selectedMood: moodId,
      isGeneratingMood: true
    });
    wx.setStorageSync('todayMood', moodId);

    api.getMoodRecommendation({
      moodId,
      relationType: this.data.relation ? this.data.relation.type : 'lover'
    })
    .then(res => {
      this.setData({
        moodRecommendation: res.data.recommendation,
        showMoodModal: true,
        isGeneratingMood: false
      });
    })
    .catch(() => {
      this.setData({ isGeneratingMood: false });
      wx.showToast({ title: '获取推荐失败', icon: 'none' });
    });
  },

  closeMoodModal() {
    this.setData({ showMoodModal: false });
  },

  sendMoodToPartner() {
    if (!this.data.relation) {
      wx.showToast({ title: '请先绑定关系', icon: 'none' });
      return;
    }

    const moodLabel = this.data.moodOptions.find(m => m.id === this.data.selectedMood).label;

    wx.showLoading({ title: '正在发送' });
    api.createRelationAction({
      relationId: this.data.relation._id,
      initiatorId: this.data.userId,
      module: 'daily',
      type: 'mood_blindbox',
      title: `今日心情：${moodLabel}`,
      summary: this.data.moodRecommendation,
      payload: { moodId: this.data.selectedMood }
    })
    .then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已发给Ta', icon: 'success' });
      this.setData({ showMoodModal: false });
      this.loadDashboard();
    })
    .catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    });
  },

  openInviteModal() {
    if (!this.ensureLogin()) return;
    this.setData({ showInviteModal: true });
  },

  closeInviteModal() {
    this.setData({ showInviteModal: false });
  },

  updateInviteForm(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`inviteForm.${field}`]: e.detail.value
    });
  },

  selectRelationType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'inviteForm.relationType': type
    });
  },

  submitInvite() {
    if (!this.ensureLogin()) return;

    const { phone, relationType, anniversary, notes } = this.data.inviteForm;
    if (!phone) {
      wx.showToast({ title: '先输入对方手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在发起邀请' });

    api.inviteRelation({
      userId: this.data.userId,
      phone,
      relationType,
      anniversary,
      notes
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '邀请已发出', icon: 'success' });
        this.setData({
          showInviteModal: false,
          inviteForm: {
            relationType: 'lover',
            phone: '',
            anniversary: '',
            notes: ''
          }
        });
        this.loadDashboard();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '邀请发送失败',
          icon: 'none'
        });
      });
  },

  ensureLogin() {
    if (this.data.loggedIn) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
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

  goToGacha() {
    wx.navigateTo({ url: '/pages/gacha/gacha' });
  },

  goToChat() {
    wx.navigateTo({ url: '/pages/chat/chat' });
  },

  goToMemories() {
    wx.navigateTo({ url: '/pages/memories/memories' });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },

  goToLove() {
    wx.switchTab({ url: '/pages/love/love' });
  },

  handleRecommendationTap(e) {
    const module = e.currentTarget.dataset.module;
    if (module === 'eat') {
      this.goToEat();
      return;
    }
    if (module === 'play') {
      this.goToPlay();
      return;
    }
    if (module === 'photo') {
      this.goToPhoto();
      return;
    }
    if (module === 'activity') {
      this.goToActivity();
    }
  },

  viewAllActions() {
    this.goToChat();
  },

  viewAllMemories() {
    this.goToMemories();
  },

  stopPropagation() {}
});
