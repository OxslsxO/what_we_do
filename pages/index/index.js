Page({
  data: {
    loading: false,
    error: ''
  },
  
  onLoad: function(options) {
    console.log('首页加载开始');
    try {
      console.log('首页加载成功');
      this.setData({
        loading: false
      });
    } catch (error) {
      console.error('首页加载错误:', error);
      this.setData({
        error: '页面加载失败',
        loading: false
      });
    }
  },
  
  goToEat: function() {
    wx.navigateTo({
      url: '../eat/eat'
    });
  },
  
  goToPlay: function() {
    wx.navigateTo({
      url: '../play/play'
    });
  },

  // 新功能跳转
  goToChat: function() {
    wx.navigateTo({
      url: '../chat/chat'
    });
  },

  goToActivity: function() {
    wx.navigateTo({
      url: '../activity/activity'
    });
  },

  goToPhoto: function() {
    wx.navigateTo({
      url: '../photo/photo'
    });
  },

  goToLove: function() {
    wx.navigateTo({
      url: '../love/love'
    });
  },

  goToSave: function() {
    wx.navigateTo({
      url: '../save/save'
    });
  }
})