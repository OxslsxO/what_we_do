import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';

const FILTERS = [
  { id: '', label: '全部' },
  { id: 'eat', label: '吃过的' },
  { id: 'play', label: '去过的' },
  { id: 'photo', label: '拍过的' },
  { id: 'daily', label: '完成的' }
];

const MODULE_LABELS = {
  eat: '今天吃点啥',
  play: '今天玩点啥',
  photo: '今天拍点啥',
  daily: '今天做点啥'
};

const TEMPLATE_LABELS = {
  ate: '一起吃过了',
  went: '一起去过了',
  shot: '一起拍下了',
  done: '一起完成了',
  responded: '被好好回应了'
};

Page({
  data: {
    loading: true,
    relation: null,
    memories: [],
    page: 1,
    limit: 12,
    hasMore: true,
    loadingMore: false,
    selectedModule: '',
    filters: FILTERS
  },

  onShow() {
    this.refreshMemories();
  },

  onPullDownRefresh() {
    this.refreshMemories(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMore();
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

  normalizeMemory(item) {
    const participants = Array.isArray(item.participants)
      ? item.participants.map((participant) => participant.nickname).filter(Boolean)
      : [];

    return {
      ...item,
      moduleLabel: MODULE_LABELS[item.module] || '关系回忆',
      templateLabel: TEMPLATE_LABELS[item.templateType] || '今天的小回忆',
      createdAtText: this.formatRelativeTime(item.createdAt),
      participantsText: participants.length ? participants.join(' / ') : '',
      coverImage: Array.isArray(item.mediaList) && item.mediaList.length ? item.mediaList[0] : ''
    };
  },

  refreshMemories(done) {
    const userId = getUserId();
    if (!isLoggedIn() || !userId) {
      wx.navigateTo({ url: '/pages/login/login' });
      if (typeof done === 'function') done();
      return;
    }

    this.setData({
      loading: true,
      page: 1,
      memories: [],
      hasMore: true
    });

    api.getRelationMemories(userId, {
      page: 1,
      limit: this.data.limit,
      module: this.data.selectedModule
    })
      .then((res) => {
        const data = res.data || {};
        const memories = (data.memories || []).map((item) => this.normalizeMemory(item));

        this.setData({
          loading: false,
          relation: data.relation || null,
          memories,
          page: 2,
          hasMore: memories.length === this.data.limit
        });

        if (typeof done === 'function') done();
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '回忆墙加载失败', icon: 'none' });
        if (typeof done === 'function') done();
      });
  },

  loadMore() {
    const userId = getUserId();
    if (!userId || this.data.loadingMore || !this.data.hasMore) return;

    this.setData({ loadingMore: true });

    api.getRelationMemories(userId, {
      page: this.data.page,
      limit: this.data.limit,
      module: this.data.selectedModule
    })
      .then((res) => {
        const data = res.data || {};
        const nextMemories = (data.memories || []).map((item) => this.normalizeMemory(item));

        this.setData({
          memories: this.data.memories.concat(nextMemories),
          page: this.data.page + 1,
          hasMore: nextMemories.length === this.data.limit,
          loadingMore: false
        });
      })
      .catch(() => {
        this.setData({ loadingMore: false });
        wx.showToast({ title: '更多回忆加载失败', icon: 'none' });
      });
  },

  selectFilter(e) {
    const selectedModule = e.currentTarget.dataset.module || '';
    this.setData({ selectedModule });
    this.refreshMemories();
  },

  previewMemoryMedia(e) {
    const images = e.currentTarget.dataset.images || [];
    const current = e.currentTarget.dataset.current || images[0];
    if (!images.length) return;

    wx.previewImage({
      current,
      urls: images
    });
  },

  goToChat() {
    wx.navigateTo({ url: '/pages/chat/chat' });
  },

  goToLove() {
    wx.switchTab({ url: '/pages/love/love' });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  }
});
