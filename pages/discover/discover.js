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
    posts: [],
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10,
    currentIndex: {},
    currentPosition: {},
    motionState: {},
    shareTitle: '发现今天的生活灵感'
  },

  onShow() {
    this.touchState = {};
    this.animTimers = {};
    this.refreshFeed();
  },

  onUnload() {
    this.clearAnimTimers();
  },

  onPullDownRefresh() {
    this.refreshFeed().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    this.loadMorePosts();
  },

  clearAnimTimers() {
    if (!this.animTimers) return;
    Object.keys(this.animTimers).forEach((key) => {
      clearInterval(this.animTimers[key]);
      delete this.animTimers[key];
    });
  },

  refreshFeed() {
    this.clearAnimTimers();
    this.touchState = {};
    this.setData({
      posts: [],
      page: 1,
      hasMore: true,
      currentIndex: {},
      currentPosition: {},
      motionState: {}
    });
    return this.loadPosts(true);
  },

  loadMorePosts() {
    if (this.data.loading || !this.data.hasMore) return Promise.resolve();
    return this.loadPosts(false);
  },

  loadPosts(reset = false) {
    if (this.data.loading) return Promise.resolve();

    const nextPage = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    const interactionPromise = isLoggedIn()
      ? api.getUserInteractions(getUserId())
      : Promise.resolve({ data: { likedPosts: [], collectedPosts: [] } });

    return Promise.all([
      api.getPosts({ page: nextPage, limit: this.data.limit }),
      interactionPromise
    ])
      .then(([feedRes, interactionRes]) => {
        const feedPosts = (feedRes.data && feedRes.data.posts) || [];
        const likedPosts = (interactionRes.data && interactionRes.data.likedPosts) || [];
        const collectedPosts = (interactionRes.data && interactionRes.data.collectedPosts) || [];
        const normalizedPosts = feedPosts.map((post) =>
          this.normalizePost(post, likedPosts, collectedPosts)
        );

        const posts = reset ? normalizedPosts : this.data.posts.concat(normalizedPosts);
        const currentIndex = { ...this.data.currentIndex };
        const currentPosition = { ...this.data.currentPosition };
        const motionState = { ...this.data.motionState };

        normalizedPosts.forEach((post) => {
          const key = this.getMediaKey(post._id);
          if (post.mediaList.length && currentIndex[key] === undefined) {
            currentIndex[key] = 0;
            currentPosition[key] = 0;
            motionState[key] = false;
          }
        });

        this.setData({
          posts,
          page: nextPage + 1,
          hasMore: normalizedPosts.length === this.data.limit,
          currentIndex,
          currentPosition,
          motionState,
          loading: false
        });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '发现流加载失败，请稍后再试',
          icon: 'none'
        });
      });
  },

  normalizePost(post, likedPosts = [], collectedPosts = []) {
    const images = Array.isArray(post.images) ? post.images : [];
    const videos = Array.isArray(post.videos) ? post.videos : [];
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const author = post.author || {};
    const userInfo = author.userInfo || {};
    const content = post.content || '';
    const summary = post.summary || content.split('\n').slice(0, 2).join('\n');
    const tagNames = tags
      .map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter(Boolean);

    return {
      ...post,
      images,
      videos,
      tags,
      tagNames,
      summary,
      contentPreview: content,
      authorName: userInfo.name || '今天的用户',
      authorInitial: (userInfo.name || '今').slice(0, 1),
      authorAvatar: userInfo.avatar || '',
      moduleLabel: MODULE_LABELS[post.sourceModule] || '日常记录',
      templateLabel: TEMPLATE_LABELS[post.templateType] || '今天记录',
      createdAtText: this.formatRelativeTime(post.createdAt),
      isLiked: likedPosts.includes(post._id),
      isCollected: collectedPosts.includes(post._id),
      mediaList: [
        ...images.map((url) => ({ type: 'image', url })),
        ...videos.map((url) => ({ type: 'video', url }))
      ]
    };
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
    return `${month} 月 ${dayValue} 日`;
  },

  getMediaKey(postId) {
    return `${postId}_media`;
  },

  ensureLogin() {
    if (isLoggedIn() && getUserId()) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  },

  goToPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  goToPost(e) {
    const { postId } = e.currentTarget.dataset;
    if (!postId) return;
    wx.navigateTo({
      url: `/pages/post/post?postId=${postId}`
    });
  },

  goToComment(e) {
    const { postId } = e.currentTarget.dataset;
    if (!postId) return;
    wx.navigateTo({
      url: `/pages/comment/comment?postId=${postId}`
    });
  },

  handleLike(e) {
    if (!this.ensureLogin()) return;

    const { postId } = e.currentTarget.dataset;
    const userId = getUserId();
    const post = this.data.posts.find((item) => item._id === postId);
    if (!post) return;

    const currentState = !!post.isLiked;
    const currentCount = post.likes || 0;
    const posts = this.data.posts.map((item) =>
      item._id === postId
        ? {
          ...item,
          isLiked: !currentState,
          likes: currentState ? currentCount - 1 : currentCount + 1
        }
        : item
    );
    this.setData({ posts });

    api.toggleLikePost(postId, userId).catch(() => {
      const restoredPosts = this.data.posts.map((item) =>
        item._id === postId
          ? {
            ...item,
            isLiked: currentState,
            likes: currentCount
          }
          : item
      );
      this.setData({ posts: restoredPosts });
      wx.showToast({ title: '点赞失败，请稍后再试', icon: 'none' });
    });
  },

  handleCollect(e) {
    if (!this.ensureLogin()) return;

    const { postId } = e.currentTarget.dataset;
    const userId = getUserId();
    const post = this.data.posts.find((item) => item._id === postId);
    if (!post) return;

    const currentState = !!post.isCollected;
    const currentCount = post.collections || 0;
    const posts = this.data.posts.map((item) =>
      item._id === postId
        ? {
          ...item,
          isCollected: !currentState,
          collections: currentState ? currentCount - 1 : currentCount + 1
        }
        : item
    );
    this.setData({ posts });

    api.toggleCollectPost(postId, userId).catch(() => {
      const restoredPosts = this.data.posts.map((item) =>
        item._id === postId
          ? {
            ...item,
            isCollected: currentState,
            collections: currentCount
          }
          : item
      );
      this.setData({ posts: restoredPosts });
      wx.showToast({ title: '收藏失败，请稍后再试', icon: 'none' });
    });
  },

  handleShare(e) {
    const { postId, title } = e.currentTarget.dataset;
    this.setData({
      shareTitle: title || '发现今天的生活灵感',
      sharePostId: postId || ''
    });

    api.sharePost(postId, getUserId()).catch(() => { });
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onShareAppMessage() {
    const sharePostId = this.data.sharePostId || '';
    return {
      title: this.data.shareTitle || '发现今天的生活灵感',
      path: sharePostId ? `/pages/post/post?postId=${sharePostId}` : '/pages/discover/discover'
    };
  },

  onShareTimeline() {
    const sharePostId = this.data.sharePostId || '';
    return {
      title: this.data.shareTitle || '发现今天的生活灵感',
      query: sharePostId ? `postId=${sharePostId}` : ''
    };
  },

  handleMediaTouchStart(e) {
    const { key, total } = e.currentTarget.dataset;
    const touch = e.touches && e.touches[0];
    if (!touch || !total || total <= 1) return;

    if (this.animTimers[key]) {
      clearInterval(this.animTimers[key]);
      delete this.animTimers[key];
    }

    this.setData({
      [`motionState.${key}`]: false
    });

    this.touchState[key] = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastTime: Date.now(),
      velocityX: 0,
      startPosition: this.data.currentPosition[key] ?? this.data.currentIndex[key] ?? 0,
      total,
      dragging: false
    };
  },

  handleMediaTouchMove(e) {
    const { key } = e.currentTarget.dataset;
    const state = this.touchState && this.touchState[key];
    const touch = e.touches && e.touches[0];
    if (!state || !touch) return;

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    if (!state.dragging) {
      if (Math.abs(deltaX) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.setData({
          [`motionState.${key}`]: false
        });
        delete this.touchState[key];
        return;
      }
      state.dragging = true;
      this.setData({
        [`motionState.${key}`]: true
      });
    }

    const stepPx = 108;
    let nextPosition = state.startPosition - deltaX / stepPx;
    const min = 0;
    const max = state.total - 1;

    if (nextPosition < min) {
      nextPosition = min + (nextPosition - min) * 0.2;
    } else if (nextPosition > max) {
      nextPosition = max + (nextPosition - max) * 0.2;
    }

    const now = Date.now();
    const dt = now - state.lastTime;
    if (dt > 0) {
      state.velocityX = (touch.clientX - state.lastX) / dt;
      state.lastX = touch.clientX;
      state.lastTime = now;
    }

    this.setData({
      [`currentPosition.${key}`]: nextPosition
    });
  },

  handleMediaTouchEnd(e) {
    const { key } = e.currentTarget.dataset;
    const state = this.touchState && this.touchState[key];
    if (!state) return;

    if (!state.dragging) {
      this.setData({
        [`motionState.${key}`]: false
      });
      delete this.touchState[key];
      return;
    }

    const currentPosition = this.data.currentPosition[key] ?? state.startPosition ?? 0;
    const min = 0;
    const max = state.total - 1;
    const cardVelocity = -state.velocityX / 108;
    let target = currentPosition + cardVelocity * 220;

    target = Math.max(min, Math.min(max, target));
    target = Math.round(target);

    delete this.touchState[key];

    if (Math.abs(currentPosition - target) < 0.08) {
      this.setData({
        [`currentPosition.${key}`]: target,
        [`currentIndex.${key}`]: target,
        [`motionState.${key}`]: false
      });
      return;
    }

    this.animateMediaTo(key, currentPosition, target, cardVelocity * 720);
  },

  animateMediaTo(key, from, to, initialVelocity = 0) {
    if (this.animTimers[key]) {
      clearInterval(this.animTimers[key]);
    }

    if (Math.abs(to - from) < 0.001 && Math.abs(initialVelocity) < 0.01) {
      this.setData({
        [`currentPosition.${key}`]: to,
        [`currentIndex.${key}`]: to,
        [`motionState.${key}`]: false
      });
      return;
    }

    let position = from;
    let velocity = initialVelocity;
    const frameMs = 16;
    const dt = frameMs / 1000;
    const stiffness = 58;
    const damping = 17;
    const maxDuration = 220;
    const startTime = Date.now();

    this.setData({
      [`motionState.${key}`]: true
    });

    this.animTimers[key] = setInterval(() => {
      const displacement = to - position;
      const acceleration = displacement * stiffness - velocity * damping;

      velocity += acceleration * dt;
      position += velocity * dt;

      this.setData({
        [`currentPosition.${key}`]: position,
        [`currentIndex.${key}`]: Math.round(position)
      });

      if (
        Math.abs(displacement) < 0.018 ||
        (Math.abs(displacement) < 0.05 && Math.abs(velocity) < 0.22) ||
        Date.now() - startTime >= maxDuration
      ) {
        clearInterval(this.animTimers[key]);
        delete this.animTimers[key];
        this.setData({
          [`currentPosition.${key}`]: to,
          [`currentIndex.${key}`]: to,
          [`motionState.${key}`]: false
        });
      }
    }, frameMs);
  }
});
