import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';

const MODULE_LABELS = {
  eat: '今天吃点啥',
  play: '今天玩点啥',
  photo: '今天拍点啥',
  activity: '今天做点啥',
  relation: '关系互动'
};

const TEMPLATE_LABELS = {
  ate: '吃过了',
  went: '去过了',
  shot: '拍到了',
  done: '完成了',
  responded: '被回应了'
};

Page({
  data: {
    postId: '',
    post: null,
    loading: true,
    shareTitle: '今天的这条记录值得被看见'
  },

  onLoad(options) {
    this.setData({
      postId: options.postId || ''
    });
  },

  onShow() {
    this.loadPost();
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
    if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))} 天前`;

    const date = new Date(value);
    const month = date.getMonth() + 1;
    const dayValue = date.getDate();
    const hourText = `${date.getHours()}`.padStart(2, '0');
    const minuteText = `${date.getMinutes()}`.padStart(2, '0');
    return `${month} 月 ${dayValue} 日 ${hourText}:${minuteText}`;
  },

  formatPost(post, likedPosts = [], collectedPosts = []) {
    if (!post) return null;

    const author = post.author || {};
    const userInfo = author.userInfo || {};
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const images = Array.isArray(post.images) ? post.images : [];
    const videos = Array.isArray(post.videos) ? post.videos : [];

    return {
      ...post,
      title: post.title || '今天的这条记录',
      summary: post.summary || '',
      tags,
      tagNames: tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean),
      images,
      videos,
      authorName: userInfo.name || '今天的用户',
      authorInitial: (userInfo.name || '今').slice(0, 1),
      authorAvatar: userInfo.avatar || '',
      createdAtText: this.formatRelativeTime(post.createdAt),
      moduleLabel: MODULE_LABELS[post.sourceModule] || '日常记录',
      templateLabel: TEMPLATE_LABELS[post.templateType] || '今天记录',
      isLiked: likedPosts.includes(post._id),
      isCollected: collectedPosts.includes(post._id)
    };
  },

  loadPost() {
    const { postId } = this.data;
    if (!postId) {
      this.setData({ loading: false });
      return;
    }

    this.setData({ loading: true });

    const interactionPromise = isLoggedIn()
      ? api.getUserInteractions(getUserId())
      : Promise.resolve({ data: { likedPosts: [], collectedPosts: [] } });

    Promise.all([api.getPostDetail(postId), interactionPromise])
      .then(([postRes, interactionRes]) => {
        const interactions = interactionRes.data || {};
        const likedPosts = interactions.likedPosts || [];
        const collectedPosts = interactions.collectedPosts || [];
        const post = this.formatPost(postRes.data, likedPosts, collectedPosts);

        this.setData({
          loading: false,
          post,
          shareTitle: post.title || post.summary || '今天的这条记录值得被看见'
        });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '帖子详情加载失败',
          icon: 'none'
        });
      });
  },

  ensureLogin() {
    if (isLoggedIn() && getUserId()) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  },

  goBack() {
    wx.navigateBack();
  },

  toggleLike() {
    if (!this.ensureLogin() || !this.data.post) return;

    const post = { ...this.data.post };
    const currentState = !!post.isLiked;
    const currentCount = post.likes || 0;
    post.isLiked = !currentState;
    post.likes = currentState ? currentCount - 1 : currentCount + 1;
    this.setData({ post });

    api.toggleLikePost(post._id, getUserId()).catch(() => {
      post.isLiked = currentState;
      post.likes = currentCount;
      this.setData({ post });
      wx.showToast({ title: '点赞失败，请稍后再试', icon: 'none' });
    });
  },

  toggleCollect() {
    if (!this.ensureLogin() || !this.data.post) return;

    const post = { ...this.data.post };
    const currentState = !!post.isCollected;
    const currentCount = post.collections || 0;
    post.isCollected = !currentState;
    post.collections = currentState ? currentCount - 1 : currentCount + 1;
    this.setData({ post });

    api.toggleCollectPost(post._id, getUserId()).catch(() => {
      post.isCollected = currentState;
      post.collections = currentCount;
      this.setData({ post });
      wx.showToast({ title: '收藏失败，请稍后再试', icon: 'none' });
    });
  },

  goToComments() {
    if (!this.data.post) return;
    wx.navigateTo({
      url: `/pages/comment/comment?postId=${this.data.post._id}`
    });
  },

  handleShareTap() {
    if (!this.data.post) return;

    api.sharePost(this.data.post._id, getUserId()).catch(() => {});
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || '今天的这条记录值得被看见',
      path: `/pages/post/post?postId=${this.data.postId}`
    };
  },

  onShareTimeline() {
    return {
      title: this.data.shareTitle || '今天的这条记录值得被看见',
      query: `postId=${this.data.postId}`
    };
  }
});
