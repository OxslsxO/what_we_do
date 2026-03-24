// app.js
App({
  onLaunch() {
    // 小程序启动时执行
    console.log('小程序启动');
    
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 未登录，跳转到登录页面
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },
  
  onShow(options) {
    // 小程序显示时执行
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 未登录，跳转到登录页面
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },
  
  onHide() {
    // 小程序隐藏时执行
  },
  
  onError(error) {
    // 小程序发生错误时执行
    console.error('小程序错误:', error);
  },
  
  globalData: {
    userInfo: null
  }
}) 