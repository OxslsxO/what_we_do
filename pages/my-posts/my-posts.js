import { api } from '../../utils/api';
import { getUserId } from '../../utils/user';

Page({
  data: {
    posts: [],
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10
  },

  onShow() {
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
      title: post.title || '今天留下的一条记录',
      content: post.summary || post.content || '',
      images: post.images || [],
      tags: post.tags || [],
      createdAt: this.formatTime(post.createdAt),
      displayType: this.getDisplayType(post.templateType || post.playType)
    }));
  },

  getDisplayType(type) {
    const typeMap = {
      ate: '吃过了',
      went: '去过了',
      shot: '拍到了',
      done: '完成了',
      responded: '被回应了',
      '今天吃点啥': '今天吃点啥',
      '今天玩点啥': '今天玩点啥',
      '今天拍点啥': '今天拍点啥'
    };
    return typeMap[type] || '记录';
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

    api.getMyPosts({
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
        wx.showToast({ title: '加载失败', icon: 'none' });
        if (typeof done === 'function') done();
      });
  },

  goBack() {
    wx.navigateBack();
  },

  goToPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  goToPost(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({
      url: `/pages/post/post?postId=${postId}`
    });
  }
});
