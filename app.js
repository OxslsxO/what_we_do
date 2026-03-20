// app.js
App({
  onLaunch() {
    // 小程序启动时执行
    console.log('小程序启动');
  },
  
  onShow(options) {
    // 小程序显示时执行
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