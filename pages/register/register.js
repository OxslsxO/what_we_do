// pages/register/register.js
import { baseUrl } from '../../config/api';

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    countdown: 0,
    loading: false,
    agreed: false,
    errors: {},
    showToast: false,
    toastMessage: '',
    showAgreementModal: false,
    showPrivacyModal: false
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

  // 密码输入
  handlePasswordInput(e) {
    const password = e.detail.value;
    this.setData({ password });
    // 清除错误提示
    if (this.data.errors.password) {
      this.setData({ 'errors.password': '' });
    }
    if (this.data.errors.confirmPassword) {
      this.setData({ 'errors.confirmPassword': '' });
    }
  },

  // 确认密码输入
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

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
    if (this.data.errors.agreement) {
      this.setData({ 'errors.agreement': '' });
    }
  },

  // 显示用户协议
  showAgreement() {
    this.setData({ showAgreementModal: true });
  },

  // 关闭用户协议
  closeAgreementModal() {
    this.setData({ showAgreementModal: false });
  },

  // 显示隐私政策
  showPrivacy() {
    this.setData({ showPrivacyModal: true });
  },

  // 关闭隐私政策
  closePrivacyModal() {
    this.setData({ showPrivacyModal: false });
  },

  // 处理注册
  handleRegister() {
    const { phone, code, password, confirmPassword, agreed } = this.data;
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

    // 验证密码
    if (!password) {
      errors.password = '请设置密码';
    } else if (password.length < 6) {
      errors.password = '密码长度至少6位';
    } else if (password.length > 20) {
      errors.password = '密码长度不能超过20位';
    }

    // 验证确认密码
    if (!confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    // 验证协议同意
    if (!agreed) {
      errors.agreement = '请阅读并同意用户协议和隐私政策';
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      return;
    }

    this.setData({ loading: true });

    // 注册请求
    wx.request({
      url: baseUrl + '/api/auth/register',
      method: 'POST',
      data: { phone, code, password },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 201 && res.data.message === '注册成功') {
          this.showToast('注册成功');
          // 跳转到登录页面
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/login/login' });
          }, 1000);
        } else {
          this.showToast(res.data.error || '注册失败');
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