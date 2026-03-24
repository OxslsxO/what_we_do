import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';

Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    loading: true,
    loadingComments: false,
    submitting: false,
    hasMore: true,
    page: 1,
    limit: 20,
    commentContent: '',
    canSend: false,
    shareTitle: '这条记录值得被看见'
  },

  onLoad(options) {
    this.setData({
      postId: options.postId || ''
    });
  },

  onShow() {
    if (!this.data.postId) return;
    this.refreshPage();
  },

  onPullDownRefresh() {
    this.refreshPage().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  normalizePost(post, likedPosts = [], collectedPosts = []) {
    if (!post) return null;

    const images = Array.isArray(post.images) ? post.images : [];
    const videos = Array.isArray(post.videos) ? post.videos : [];
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const author = post.author || {};
    const userInfo = author.userInfo || {};

    return {
      ...post,
      images,
      videos,
      tags,
      tagNames: tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean),
      authorName: userInfo.name || '今天的用户',
      authorInitial: (userInfo.name || '今').slice(0, 1),
      authorAvatar: userInfo.avatar || '',
      createdAtText: this.formatRelativeTime(post.createdAt),
      isLiked: likedPosts.includes(post._id),
      isCollected: collectedPosts.includes(post._id)
    };
  },

  normalizeComment(comment) {
    const author = comment.author || {};
    const userInfo = author.userInfo || {};
    return {
      ...comment,
      authorName: userInfo.name || '今天的用户',
      authorInitial: (userInfo.name || '今').slice(0, 1),
      authorAvatar: userInfo.avatar || '',
      createdAtText: this.formatRelativeTime(comment.createdAt)
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

  refreshPage() {
    this.setData({
      loading: true,
      page: 1,
      comments: [],
      hasMore: true
    });

    const interactionPromise = isLoggedIn()
      ? api.getUserInteractions(getUserId())
      : Promise.resolve({ data: { likedPosts: [], collectedPosts: [] } });

    return Promise.all([
      api.getPostDetail(this.data.postId),
      api.getComments(this.data.postId, { page: 1, limit: this.data.limit }),
      interactionPromise
    ])
      .then(([postRes, commentRes, interactionRes]) => {
        const interactions = interactionRes.data || {};
        const likedPosts = interactions.likedPosts || [];
        const collectedPosts = interactions.collectedPosts || [];
        const post = this.normalizePost(postRes.data, likedPosts, collectedPosts);
        const comments = ((commentRes.data && commentRes.data.comments) || []).map((item) =>
          this.normalizeComment(item)
        );

        this.setData({
          post,
          comments,
          page: 2,
          hasMore: comments.length === this.data.limit,
          loading: false
        });
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({
          title: '评论页加载失败，请稍后再试',
          icon: 'none'
        });
      });
  },

  loadMoreComments() {
    if (this.data.loadingComments || !this.data.hasMore) return;

    this.setData({ loadingComments: true });

    api
      .getComments(this.data.postId, { page: this.data.page, limit: this.data.limit })
      .then((res) => {
        const nextComments = ((res.data && res.data.comments) || []).map((item) =>
          this.normalizeComment(item)
        );
        this.setData({
          comments: this.data.comments.concat(nextComments),
          page: this.data.page + 1,
          hasMore: nextComments.length === this.data.limit,
          loadingComments: false
        });
      })
      .catch(() => {
        this.setData({ loadingComments: false });
        wx.showToast({ title: '更多评论加载失败', icon: 'none' });
      });
  },

  updateCommentContent(e) {
    const commentContent = e.detail.value || '';
    this.setData({
      commentContent,
      canSend: !!commentContent.trim()
    });
  },

  ensureLogin() {
    if (isLoggedIn() && getUserId()) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  },

  sendComment() {
    const content = (this.data.commentContent || '').trim();
    if (!content || this.data.submitting) return;
    if (!this.ensureLogin()) return;

    this.setData({ submitting: true });

    api
      .addComment(this.data.postId, {
        userId: getUserId(),
        content
      })
      .then(() => {
        this.setData({
          commentContent: '',
          canSend: false,
          submitting: false,
          page: 1,
          comments: []
        });

        if (this.data.post) {
          this.setData({
            'post.comments': (this.data.post.comments || 0) + 1
          });
        }

        return this.loadFreshComments();
      })
      .then(() => {
        wx.showToast({
          title: '评论发布成功',
          icon: 'success'
        });
      })
      .catch(() => {
        this.setData({ submitting: false });
        wx.showToast({
          title: '评论失败，请稍后再试',
          icon: 'none'
        });
      });
  },

  loadFreshComments() {
    return api
      .getComments(this.data.postId, { page: 1, limit: this.data.limit })
      .then((res) => {
        const comments = ((res.data && res.data.comments) || []).map((item) =>
          this.normalizeComment(item)
        );
        this.setData({
          comments,
          page: 2,
          hasMore: comments.length === this.data.limit,
          submitting: false
        });
      });
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

  handleShareTap() {
    if (!this.data.post) return;

    this.setData({
      shareTitle: this.data.post.title || this.data.post.summary || '这条记录值得被看见'
    });

    api.sharePost(this.data.post._id, getUserId()).catch(() => {});
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  openPostDetail() {
    if (!this.data.post) return;
    wx.navigateTo({
      url: `/pages/post/post?postId=${this.data.post._id}`
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || '这条记录值得被看见',
      path: `/pages/post/post?postId=${this.data.postId}`
    };
  },

  onShareTimeline() {
    return {
      title: this.data.shareTitle || '这条记录值得被看见',
      query: `postId=${this.data.postId}`
    };
  }
});
