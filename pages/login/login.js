// pages/login/login.js
import { baseUrl } from '../../config/api';

Page({
  data: {
    loginType: 'code', // 默认为验证码登录
    phone: '',
    password: '',
    code: '',
    showPassword: false,
    countdown: 0,
    loading: false,
    errors: {},
    showToast: false,
    toastMessage: ''
  },



  // 手机号输入
  handlePhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ phone });
    // 清除错误提示
    if (this.data.errors.phone) {
      this.setData({ 'errors.phone': '' });
    }
  },

  // 验证码输入
  handleCodeInput(e) {
    const code = e.detail.value;
    this.setData({ code });
    // 清除错误提示
    if (this.data.errors.code) {
      this.setData({ 'errors.code': '' });
    }
  },

  // 发送验证码
  sendCode() {
    const { phone } = this.data;
    const errors = {};

    // 验证手机号
    if (!phone) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.phone = '请输入正确的手机号';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    // 测试版本：生成测试验证码并显示
    const testCode = '123456';
    this.showToast(`验证码已发送，测试验证码：${testCode}`);
    this.startCountdown();
    
    // 发送验证码请求（实际环境使用）
    /*
    wx.request({
      url: baseUrl + '/api/auth/send-code',
      method: 'POST',
      data: { phone },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.showToast('验证码已发送');
          this.startCountdown();
        } else {
          this.showToast(res.data.error || '发送验证码失败');
        }
      },
      fail: () => {
        this.showToast('网络错误，请稍后重试');
      }
    });
    */
  },

  // 开始倒计时
  startCountdown() {
    let countdown = 60;
    this.setData({ countdown });

    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });
      if (countdown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  },

  // 处理登录
  handleLogin() {
    const { phone, code } = this.data;
    const errors = {};

    // 验证手机号
    if (!phone) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.phone = '请输入正确的手机号';
    }

    // 验证验证码
    if (!code) {
      errors.code = '请输入验证码';
    } else if (code.length !== 6) {
      errors.code = '请输入6位验证码';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    this.setData({ loading: true });

    // 登录请求
    wx.request({
      url: baseUrl + '/api/auth/login-code',
      method: 'POST',
      data: { phone, code },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200 && res.data.token) {
          // 保存token和用户信息
          wx.setStorageSync('token', res.data.token);
          wx.setStorageSync('user', res.data.user);
          
          this.showToast('登录成功');
          // 检查是否是新用户，如果是则引导完善信息
          if (res.data.isNewUser) {
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
            }, 1000);
          } else {
            // 直接跳转到首页
            setTimeout(() => {
              wx.switchTab({ url: '/pages/index/index' });
            }, 1000);
          }
        } else {
          this.showToast(res.data.error || '登录失败');
        }
      },
      fail: () => {
        this.setData({ loading: false });
        this.showToast('网络错误，请稍后重试');
      }
    });
  },

  // 微信登录
  wechatLogin() {
    wx.showLoading({ title: '正在登录...' });
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送微信登录请求
          wx.request({
            url: baseUrl + '/api/auth/wechat-login',
            method: 'POST',
            data: { code: res.code },
            success: (response) => {
              wx.hideLoading();
              if (response.statusCode === 200 && response.data.token) {
                // 保存token和用户信息
                wx.setStorageSync('token', response.data.token);
                wx.setStorageSync('user', response.data.user);
                this.showToast('登录成功');
                // 跳转到首页
                setTimeout(() => {
                  wx.switchTab({ url: '/pages/index/index' });
                }, 1000);
              } else {
                this.showToast(response.data.error || '微信登录失败');
              }
            },
            fail: () => {
              wx.hideLoading();
              this.showToast('网络错误，请稍后重试');
            }
          });
        } else {
          wx.hideLoading();
          this.showToast('获取微信登录凭证失败');
        }
      },
      fail: () => {
        wx.hideLoading();
        this.showToast('微信登录失败');
      }
    });
  },

  // 跳转到忘记密码页面
  goToForgotPassword() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
  },

  // 显示提示信息
  showToast(message) {
    this.setData({ showToast: true, toastMessage: message });
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 2000);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (token) {
      // 已登录，跳转到首页
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
});