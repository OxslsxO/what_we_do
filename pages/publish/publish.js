// pages/publish/publish.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    food: '',
    module: '今天吃点啥',
    title: '',
    content: '',
    images: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从本地存储中读取食物和菜谱信息
    const food = wx.getStorageSync('publish_food');
    const recipe = wx.getStorageSync('publish_recipe');
    
    if (food) {
      this.setData({
        food: food,
        title: `${food}的制作方法`,
        content: recipe || `# ${food}制作方法\n\n## 材料\n- 材料1\n- 材料2\n- 材料3\n\n## 步骤\n1. 准备材料\n2. 处理食材\n3. 烹饪\n4. 装盘\n\n## 小贴士\n- 调整调料\n- 控制时间`
      });
      
      // 清除本地存储，避免数据残留
      wx.removeStorageSync('publish_food');
      wx.removeStorageSync('publish_recipe');
    }
  },

  /**
   * 更新标题
   */
  updateTitle(e) {
    this.setData({ title: e.detail.value });
  },

  /**
   * 更新内容
   */
  updateContent(e) {
    this.setData({ content: e.detail.value });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseImage({
      count: 9,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths)
        });
      }
    });
  },

  /**
   * 删除图片
   */
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  /**
   * 发布文章
   */
  publish() {
    const { title, content, food, module } = this.data;
    if (!title || !content) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '发布中...' });
    
    // 这里应该调用后端接口发布文章
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '发布成功', icon: 'success' });
      wx.navigateBack();
    }, 1000);
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});