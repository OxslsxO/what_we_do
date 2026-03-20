// 导入API工具
import { api } from '../../utils/api';
Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    inputContent: '',
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    const { postId } = options;
    this.setData({ postId });
    this.getPostDetail();
    this.getComments();
  },

  // 获取帖子详情
  getPostDetail() {
    const { postId } = this.data;
    api.getPostDetail(postId).then(res => {
      this.setData({ post: res.data });
    }).catch(err => {
      console.error('获取帖子详情失败:', err);
    });
  },

  // 获取评论列表
  getComments(refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const { postId, limit } = this.data;
    
    this.setData({ loading: true });
    
    api.getComments(postId, {
      page,
      limit
    }).then(res => {
      const newComments = res.data.comments;
      const comments = refresh ? newComments : [...this.data.comments, ...newComments];
      
      this.setData({
        comments,
        page: page + 1,
        hasMore: newComments.length === limit,
        loading: false
      });
    }).catch(err => {
      console.error('获取评论列表失败:', err);
      this.setData({ loading: false });
    });
  },

  // 输入内容变化
  onInputChange(e) {
    this.setData({ inputContent: e.detail.value });
  },

  // 发送评论
  sendComment() {
    const { postId, inputContent } = this.data;
    const userId = 'user123'; // 实际应该从登录状态获取
    
    if (!inputContent.trim()) return;
    
    api.addComment(postId, {
      userId,
      content: inputContent
    }).then(res => {
      // 清空输入框
      this.setData({ inputContent: '' });
      // 刷新评论列表
      this.getComments(true);
    }).catch(err => {
      console.error('发送评论失败:', err);
    });
  },

  // 格式化时间
  formatTime(time) {
    const date = new Date(time);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 30) {
      return `${days}天前`;
    } else {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },
  
  // 预览图片
  previewImage(e) {
    const imageIndex = e.currentTarget.dataset.imageIndex;
    const post = this.data.post;
    if (post && post.images) {
      // 确保传递正确的参数
      const currentImage = post.images[imageIndex];
      const imageUrls = [...post.images];
      wx.previewImage({
        current: currentImage,
        urls: imageUrls
      });
    }
  }
});