// 导入API工具
import { api, baseUrl } from '../../utils/api';
Page({
  data: {
    content: '',
    images: [],
    selectedPlayType: '',
    tags: [],
    tagInput: ''
  },

  // 内容输入变化
  onContentChange(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    const remaining = 9 - this.data.images.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = this.data.images.concat(res.tempFilePaths);
        this.setData({
          images: newImages
        });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({
      images
    });
  },

  // 选择玩法类型
  selectPlayType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedPlayType: type
    });
  },

  // 标签输入变化
  onTagInput(e) {
    this.setData({
      tagInput: e.detail.value
    });
  },

  // 添加标签
  addTag() {
    const tag = this.data.tagInput.trim();
    if (tag && !this.data.tags.includes(tag)) {
      const tags = this.data.tags.concat(tag);
      this.setData({
        tags,
        tagInput: ''
      });
    }
  },

  // 删除标签
  deleteTag(e) {
    const index = e.currentTarget.dataset.index;
    const tags = this.data.tags.filter((_, i) => i !== index);
    this.setData({
      tags
    });
  },

  // 取消发布
  cancel() {
    wx.navigateBack();
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

  // 提交发布
  submit() {
    const { content, images, selectedPlayType, tags } = this.data;
    
    // 验证
    if (!content) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedPlayType) {
      wx.showToast({
        title: '请选择玩法类型',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载动画
    wx.showLoading({
      title: '发布中...'
    });
    
    // 处理图片上传
    if (images.length > 0) {
      // 先将所有图片转换为base64
      const imagePromises = images.map(filePath => {
        return new Promise((resolve, reject) => {
          wx.getFileSystemManager().readFile({
            filePath: filePath,
            encoding: 'base64',
            success: res => {
              resolve(`data:image/jpeg;base64,${res.data}`);
            },
            fail: err => {
              reject(err);
            }
          });
        });
      });
      
      Promise.all(imagePromises).then(base64Images => {
        // 调用API创建帖子，传递base64编码的图片
        api.createPost({
          content,
          images: base64Images,
          tags,
          playType: selectedPlayType,
          author: 'user123'
        }).then(res => {
          wx.hideLoading();
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });
          // 跳转到广场标签页
          wx.switchTab({
            url: '../discover/discover'
          });
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({
            title: '发布失败，请重试',
            icon: 'none'
          });
          console.error('发布帖子失败:', err);
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '图片处理失败，请重试',
          icon: 'none'
        });
        console.error('图片处理失败:', err);
      });
    } else {
      // 没有图片，直接调用API
      api.createPost({
        content,
        images: [],
        tags,
        playType: selectedPlayType,
        author: 'user123' // 实际应该从登录状态获取
      }).then(res => {
        wx.hideLoading();
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        // 跳转到广场标签页
        wx.switchTab({
          url: '../discover/discover'
        });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
        console.error('发布帖子失败:', err);
      });
    }
  }
});