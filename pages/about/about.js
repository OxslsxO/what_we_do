Page({
  data: {
    version: '0.2.0',
    modules: [
      '今天吃点啥',
      '今天玩点啥',
      '今天拍点啥',
      '今天做点啥',
      '关系空间',
      '发现 / 帖子 / 评论'
    ]
  },

  goToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToRelation() {
    wx.switchTab({ url: '/pages/love/love' });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  }
});
