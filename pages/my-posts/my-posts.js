// 导入API工具
import { api } from '../../utils/api';
Page({
  data: {
    posts: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.getMyPosts();
  },

  onShow() {
    // 页面显示时重新检查用户交互状态
    this.checkUserInteractions();
  },

  // 获取我的帖子
  getMyPosts(refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const { limit } = this.data;
    
    this.setData({ loading: true });
    
    // 调用后端API获取我的帖子
    api.getMyPosts({
      page,
      limit,
      userId: 'user123' // 实际应该从登录状态获取
    }).then(res => {
      console.log('获取我的帖子成功:', res.data.posts);
      const newPosts = res.data.posts.map(post => ({
        ...post,
        isLiked: false,
        isCollected: false
      }));
      const posts = refresh ? newPosts : [...this.data.posts, ...newPosts];
      
      this.setData({
        posts,
        page: page + 1,
        hasMore: newPosts.length === limit,
        loading: false
      });
      
      // 检查当前用户的点赞和收藏状态
      this.checkUserInteractions();
    }).catch(err => {
      console.error('获取我的帖子失败:', err);
      this.setData({ loading: false });
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.getMyPosts();
    }
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

  // 获取玩法类型名称
  getPlayTypeName(type) {
    const typeMap = {
      'eat': '吃点啥',
      'play': '玩点啥',
      'chat': '聊点啥',
      'activity': '做点啥',
      'photo': '拍点啥',
      'love': '宠点啥',
      'save': '攒点啥'
    };
    return typeMap[type] || '';
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点赞帖子
  likePost(e) {
    const postId = e.currentTarget.dataset.id;
    const userId = 'user123'; // 实际应该从登录状态获取
    
    // 找到当前帖子
    const post = this.data.posts.find(p => p._id === postId);
    if (!post) return;
    
    // 根据当前点赞状态决定调用哪个API
    const isLiked = post.isLiked || false;
    const likePromise = isLiked ? 
      api.unlikePost(postId, userId) : 
      api.likePost(postId, userId);
    
    likePromise.then(res => {
      // 更新本地帖子数据
      const posts = this.data.posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: isLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !isLiked
          };
        }
        return post;
      });
      this.setData({ posts });
    }).catch(err => {
      console.error('操作失败:', err);
    });
  },

  // 评论帖子
  commentPost(e) {
    const postId = e.currentTarget.dataset.id;
    // 跳转到评论页面
    wx.navigateTo({
      url: `/pages/comment/comment?postId=${postId}`
    });
  },

  // 收藏帖子
  collectPost(e) {
    const postId = e.currentTarget.dataset.id;
    const userId = 'user123'; // 实际应该从登录状态获取
    
    // 找到当前帖子
    const post = this.data.posts.find(p => p._id === postId);
    if (!post) return;
    
    // 根据当前收藏状态决定调用哪个API
    const isCollected = post.isCollected || false;
    const collectPromise = isCollected ? 
      api.uncollectPost(postId, userId) : 
      api.collectPost(postId, userId);
    
    collectPromise.then(res => {
      // 更新本地帖子数据
      const posts = this.data.posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            collections: isCollected ? post.collections - 1 : post.collections + 1,
            isCollected: !isCollected
          };
        }
        return post;
      });
      this.setData({ posts });
    }).catch(err => {
      console.error('操作失败:', err);
    });
  },

  // 跳转到发布帖子页面
  goToPost() {
    wx.navigateTo({
      url: '../post/post'
    });
  },

  // 检查用户的点赞和收藏状态
  checkUserInteractions() {
    const posts = this.data.posts;
    if (posts.length === 0) return;
    
    const userId = 'user123'; // 实际应该从登录状态获取
    
    // 调用后端API查询用户的点赞和收藏记录
    api.getUserInteractions(userId).then(res => {
      const { likedPosts, collectedPosts } = res.data;
      
      // 更新帖子的点赞和收藏状态
      const updatedPosts = posts.map(post => ({
        ...post,
        isLiked: likedPosts.includes(post._id),
        isCollected: collectedPosts.includes(post._id)
      }));
      
      this.setData({ posts: updatedPosts });
    }).catch(err => {
      console.error('获取用户交互状态失败:', err);
    });
  },
  
  // 预览图片
  previewImage(e) {
    const postIndex = e.currentTarget.dataset.postIndex;
    const imageIndex = e.currentTarget.dataset.imageIndex;
    const post = this.data.posts[postIndex];
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