// pages/forgot-password/forgot-password.js
import { baseUrl } from '../../config/api';

Page({
  data: {
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
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

  // 新密码输入
  handleNewPasswordInput(e) {
    const newPassword = e.detail.value;
    this.setData({ newPassword });
    // 清除错误提示
    if (this.data.errors.newPassword) {
      this.setData({ 'errors.newPassword': '' });
    }
    if (this.data.errors.confirmPassword) {
      this.setData({ 'errors.confirmPassword': '' });
    }
  },

  // 确认新密码输入
  handleConfirmPasswordInput(e) {
    const confirmPassword = e.detail.value;
    this.setData({ confirmPassword });
    // 清除错误提示
    if (this.data.errors.confirmPassword) {
      this.setData({ 'errors.confirmPassword': '' });
    }
  },

  // 切换密码显示
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
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

    // 发送验证码请求
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

  // 处理重置密码
  handleResetPassword() {
    const { phone, code, newPassword, confirmPassword } = this.data;
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

    // 验证新密码
    if (!newPassword) {
      errors.newPassword = '请设置新密码';
    } else if (newPassword.length < 6) {
      errors.newPassword = '密码长度至少6位';
    } else if (newPassword.length > 20) {
      errors.newPassword = '密码长度不能超过20位';
    }

    // 验证确认密码
    if (!confirmPassword) {
      errors.confirmPassword = '请确认新密码';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    this.setData({ loading: true });

    // 重置密码请求
    wx.request({
      url: baseUrl + '/api/auth/reset-password',
      method: 'POST',
      data: { phone, code, newPassword },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200 && res.data.message === '密码重置成功') {
          this.showToast('密码重置成功');
          // 跳转到登录页面
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/login/login' });
          }, 1000);
        } else {
          this.showToast(res.data.error || '密码重置失败');
        }
      },
      fail: () => {
        this.setData({ loading: false });
        this.showToast('网络错误，请稍后重试');
      }
    });
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
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