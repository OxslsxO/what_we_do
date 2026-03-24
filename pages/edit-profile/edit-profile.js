// pages/edit-profile/edit-profile.js
import { baseUrl } from '../../config/api';

Page({
  data: {
    formData: {
      name: '',
      gender: '',
      birthday: '',
      desc: '',
      avatar: ''
    },
    errors: {},
    loading: false,
    showToast: false,
    toastMessage: '',
    genderSet: false,
    genderText: '',
    currentDate: new Date().toISOString().split('T')[0]
  },

  onLoad(options) {
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    const user = wx.getStorageSync('user');
    if (user && user.userInfo) {
      const userInfo = user.userInfo;
      this.setData({
        formData: {
          name: userInfo.name || '',
          gender: userInfo.gender || '',
          birthday: userInfo.birthday || '',
          desc: userInfo.desc || '',
          avatar: userInfo.avatar || ''
        },
        genderSet: !!userInfo.gender,
        genderText: this.getGenderText(userInfo.gender)
      });
    }
  },

  // 获取性别文本
  getGenderText(gender) {
    switch (gender) {
      case 'male':
        return '男';
      case 'female':
        return '女';
      case 'other':
        return '其他';
      default:
        return '';
    }
  },

  // 处理昵称输入
  handleNameInput(e) {
    const name = e.detail.value;
    this.setData({ 'formData.name': name });
    // 清除错误提示
    if (this.data.errors.name) {
      this.setData({ 'errors.name': '' });
    }
  },

  // 处理昵称输入框失去焦点
  async handleNameBlur() {
    const name = this.data.formData.name.trim();
    if (name && name.length >= 2 && name.length <= 20) {
      // 检查昵称唯一性
      const isUnique = await this.checkNameUnique(name);
      if (!isUnique) {
        this.setData({ 'errors.name': '昵称已被使用' });
      }
    }
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender,
      genderText: this.getGenderText(gender)
    });
    // 清除错误提示
    if (this.data.errors.gender) {
      this.setData({ 'errors.gender': '' });
    }
  },

  // 处理日期选择变化
  handleDateChange(e) {
    const birthday = e.detail.value;
    this.setData({ 'formData.birthday': birthday });
    // 清除错误提示
    if (this.data.errors.birthday) {
      this.setData({ 'errors.birthday': '' });
    }
  },

  // 处理个性签名输入
  handleDescInput(e) {
    const desc = e.detail.value;
    this.setData({ 'formData.desc': desc });
    // 清除错误提示
    if (this.data.errors.desc) {
      this.setData({ 'errors.desc': '' });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFiles;
        if (tempFilePaths && tempFilePaths.length > 0) {
          this.uploadAvatar(tempFilePaths[0].tempFilePath);
        }
      },
      fail: (err) => {
        console.error('选择头像失败:', err);
      }
    });
  },

  // 上传头像
  uploadAvatar(tempFilePath) {
    this.setData({ loading: true });
    
    wx.uploadFile({
      url: baseUrl + '/api/auth/upload-avatar',
      filePath: tempFilePath,
      name: 'avatar',
      formData: {
        userId: wx.getStorageSync('user')._id
      },
      success: (res) => {
        this.setData({ loading: false });
        try {
          const data = JSON.parse(res.data);
          if (data.success && data.avatarUrl) {
            this.setData({ 'formData.avatar': data.avatarUrl });
            this.showToast('头像上传成功');
          } else {
            this.showToast('头像上传失败');
          }
        } catch (error) {
          console.error('解析上传结果失败:', error);
          this.showToast('头像上传失败');
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('上传头像失败:', err);
        this.showToast('网络错误，请稍后重试');
      }
    });
  },

  // 验证表单数据
  validateForm() {
    const { name, gender } = this.data.formData;
    const errors = {};

    // 验证昵称
    if (!name.trim()) {
      errors.name = '请输入昵称';
    } else if (name.length < 2) {
      errors.name = '昵称至少2个字符';
    } else if (name.length > 20) {
      errors.name = '昵称最多20个字符';
    }

    // 验证性别（如果未设置）
    if (!this.data.genderSet && !gender) {
      errors.gender = '请选择性别';
    }

    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  // 检查昵称唯一性
  async checkNameUnique(name) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: baseUrl + '/api/auth/check-name',
          method: 'POST',
          data: { name },
          success: resolve,
          fail: reject
        });
      });

      if (response.statusCode === 200) {
        return response.data.isUnique;
      } else {
        return false;
      }
    } catch (error) {
      console.error('检查昵称唯一性失败:', error);
      return false;
    }
  },

  // 保存用户信息
  async saveProfile() {
    // 验证表单
    if (!this.validateForm()) {
      return;
    }

    this.setData({ loading: true });

    const user = wx.getStorageSync('user');
    if (!user || !user._id) {
      this.setData({ loading: false });
      this.showToast('用户信息不存在');
      return;
    }
    
    const userId = user._id;

    // 保存用户信息
    wx.request({
      url: baseUrl + '/api/auth/update-profile',
      method: 'PUT',
      data: {
        userId: userId,
        userInfo: this.data.formData
      },
      success: (res) => {
        this.setData({ loading: false });
        if (res.statusCode === 200 && res.data.user) {
          // 更新本地存储的用户信息
          const updatedUser = {
            ...user,
            _id: userId,
            userInfo: res.data.user.userInfo
          };
          wx.setStorageSync('user', updatedUser);
          this.showToast('保存成功');
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        } else {
          this.showToast(res.data.error || '保存失败');
        }
      },
      fail: () => {
        this.setData({ loading: false });
        this.showToast('网络错误，请稍后重试');
      }
    });
  },

  // 显示提示信息
  showToast(message) {
    this.setData({ showToast: true, toastMessage: message });
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 2000);
  }
});