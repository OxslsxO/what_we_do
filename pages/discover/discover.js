// 导入API工具
import { api } from '../../utils/api';
Page({
  data: {
    posts: [],
    hotTags: [],
    selectedTag: '',
    selectedPlayType: '',
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false,
    showFilterModal: false,
    filterModalAnimation: {},
    filterOverlayAnimation: {},
    postAnimations: [],
    loadMoreAnimation: {}
  },

  onLoad() {
    this.getHotTags();
    this.getPosts();
  },

  onShow() {
    // 页面显示时重新检查用户交互状态
    this.checkUserInteractions();
  },

  // 获取热门标签
  getHotTags() {
    api.getHotTags().then(res => {
      this.setData({
        hotTags: res.data
      });
    }).catch(err => {
      console.error('获取热门标签失败:', err);
    });
  },

  // 获取帖子列表
  getPosts(refresh = false) {
    if (this.data.loading) return;
    
    const page = refresh ? 1 : this.data.page;
    const { selectedTag, selectedPlayType, limit } = this.data;
    
    this.setData({ loading: true });
    
    api.getPosts({
      page,
      limit,
      tag: selectedTag,
      playType: selectedPlayType
    }).then(res => {
      console.log('帖子数据:', res.data.posts);
      const newPosts = res.data.posts.map(post => ({
        ...post,
        isLiked: false,
        isCollected: false
      }));
      const posts = refresh ? newPosts : [...this.data.posts, ...newPosts];
      
      // 为新帖子创建动画
      const postAnimations = this.data.postAnimations;
      if (refresh) {
        postAnimations.length = 0;
      }
      
      newPosts.forEach((_, index) => {
        const animation = wx.createAnimation({
          duration: 500,
          timingFunction: 'ease-out'
        });
        
        animation.translateY(50).opacity(0).step();
        animation.translateY(0).opacity(1).step();
        
        postAnimations.push(animation.export());
      });
      
      this.setData({
        posts,
        postAnimations,
        page: page + 1,
        hasMore: newPosts.length === limit,
        loading: false
      });
      
      // 检查当前用户的点赞和收藏状态
      this.checkUserInteractions();
    }).catch(err => {
      console.error('获取帖子列表失败:', err);
      this.setData({ loading: false });
    });
  },

  // 选择标签
  selectTag(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({
      selectedTag: tag
    });
  },

  // 选择玩法类型
  selectPlayType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedPlayType: type
    });
  },

  // 显示筛选弹窗
  showFilter() {
    // 创建筛选弹窗动画
    const modalAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    const overlayAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    modalAnimation.translateX('100%').step();
    overlayAnimation.opacity(0).step();
    
    this.setData({
      showFilterModal: true,
      filterModalAnimation: modalAnimation.export(),
      filterOverlayAnimation: overlayAnimation.export()
    });
    
    // 执行动画
    setTimeout(() => {
      modalAnimation.translateX(0).step();
      overlayAnimation.opacity(1).step();
      
      this.setData({
        filterModalAnimation: modalAnimation.export(),
        filterOverlayAnimation: overlayAnimation.export()
      });
    }, 10);
  },

  // 隐藏筛选弹窗
  hideFilter() {
    // 创建筛选弹窗关闭动画
    const modalAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in'
    });
    
    const overlayAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in'
    });
    
    modalAnimation.translateX('100%').step();
    overlayAnimation.opacity(0).step();
    
    this.setData({
      filterModalAnimation: modalAnimation.export(),
      filterOverlayAnimation: overlayAnimation.export()
    });
    
    // 动画结束后隐藏弹窗
    setTimeout(() => {
      this.setData({ showFilterModal: false });
    }, 300);
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      selectedTag: '',
      selectedPlayType: ''
    });
  },

  // 确认筛选
  confirmFilter() {
    this.hideFilter();
    this.setData({
      page: 1,
      hasMore: true,
      posts: [],
      postAnimations: []
    });
    this.getPosts();
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      // 创建加载更多按钮动画
      const loadMoreAnimation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      });
      
      loadMoreAnimation.scale(0.9).step();
      loadMoreAnimation.scale(1).step();
      
      this.setData({ loadMoreAnimation: loadMoreAnimation.export() });
      
      this.getPosts();
    }
  },

  // 点赞帖子
  likePost(e) {
    const postId = e.currentTarget.dataset.id;
    const postIndex = e.currentTarget.dataset.index;
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
      // 创建点赞动画
      const animation = wx.createAnimation({
        duration: 100,
        timingFunction: 'ease-in-out'
      });
      
      animation.scale(1.2).step();
      animation.scale(1).step();
      
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
      
      // 触发震动效果
      wx.vibrateShort({ type: 'light' });
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
    const postIndex = e.currentTarget.dataset.index;
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
      // 创建收藏动画
      const animation = wx.createAnimation({
        duration: 100,
        timingFunction: 'ease-in-out'
      });
      
      animation.scale(1.2).step();
      animation.scale(1).step();
      
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
      
      // 触发震动效果
      wx.vibrateShort({ type: 'light' });
    }).catch(err => {
      console.error('操作失败:', err);
    });
  },

  // 跳转到发布帖子页面
  goToPost() {
    console.log('点击了发布按钮');
    wx.redirectTo({
      url: '/pages/post/post',
      success: function(res) {
        console.log('跳转成功', res);
      },
      fail: function(res) {
        console.log('跳转失败', res);
      }
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
    console.log('预览图片:', postIndex, imageIndex, post);
    if (post && post.images) {
      // 确保传递正确的参数
      const currentImage = post.images[imageIndex];
      const imageUrls = [...post.images];
      console.log('预览图片参数:', currentImage, imageUrls);
      wx.previewImage({
        current: currentImage,
        urls: imageUrls
      });
    }
  },
  
  // 图片加载完成
  imageLoad(e) {
    const { postIndex, imageIndex } = e.currentTarget.dataset;
    const posts = this.data.posts;
    
    // 为加载完成的图片添加加载类
    if (posts[postIndex] && posts[postIndex].images[imageIndex]) {
      this.setData({
        [`posts[${postIndex}].images[${imageIndex}].loaded`]: true
      });
    }
  },
  
  // 页面滚动时的动画效果
  onPageScroll(e) {
    const scrollTop = e.scrollTop;
    const posts = this.data.posts;
    const postAnimations = [];
    
    posts.forEach((post, index) => {
      const animation = wx.createAnimation({
        duration: 100,
        timingFunction: 'ease-out'
      });
      
      // 计算每个帖子的浮动效果
      const offset = scrollTop - (index * 300);
      const float = Math.sin(offset / 100) * 5;
      
      animation.translateY(float).step();
      postAnimations.push(animation.export());
    });
    
    this.setData({ postAnimations });
  }
});