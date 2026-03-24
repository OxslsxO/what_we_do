import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';

Page({
  data: {
    posts: [],
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    });
    this.getPosts();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.getPosts();
    }
  },

  onPullDownRefresh() {
    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    });
    this.getPosts(() => wx.stopPullDownRefresh());
  },

  formatPosts(posts = []) {
    return posts.map((post) => ({
      ...post,
      title: post.title || '一条被收藏的记录',
      summary: post.summary || post.content || '',
      mediaCover: (post.images && post.images[0]) || (post.videos && post.videos[0]) || '',
      createdAtText: this.formatTime(post.createdAt)
    }));
  },

  formatTime(value) {
    if (!value) return '刚刚';
    const date = new Date(value);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  },

  getPosts(done) {
    const userId = getUserId();
    if (!userId) {
      this.setData({ loading: false });
      if (typeof done === 'function') done();
      return;
    }

    this.setData({ loading: true });

    api.getCollectedPosts({
      userId,
      page: this.data.page,
      limit: this.data.limit
    })
      .then((res) => {
        const data = res.data || {};
        const nextPosts = this.formatPosts(data.posts || []);
        this.setData({
          loading: false,
          posts: this.data.page === 1 ? nextPosts : this.data.posts.concat(nextPosts),
          hasMore: nextPosts.length === this.data.limit
        });
        if (typeof done === 'function') done();
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '收藏加载失败', icon: 'none' });
        if (typeof done === 'function') done();
      });
  },

  goBack() {
    wx.navigateBack();
  },

  goToPost(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({
      url: `/pages/post/post?postId=${postId}`
    });
  },

  toggleCollect(e) {
    const postId = e.currentTarget.dataset.postId;
    const userId = getUserId();
    if (!postId || !userId) return;

    wx.showLoading({ title: '正在处理' });
    api.toggleCollectPost(postId, userId)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已从收藏移除', icon: 'success' });
        this.setData({
          posts: this.data.posts.filter((item) => item._id !== postId)
        });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '操作失败',
          icon: 'none'
        });
      });
  }
});
