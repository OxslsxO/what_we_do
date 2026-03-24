const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  relationSyncEnabled: true,
  nearbyRecommendationEnabled: true,
  autoSaveDraftEnabled: true
};

Page({
  data: {
    settings: DEFAULT_SETTINGS
  },

  onShow() {
    this.loadSettings();
  },

  loadSettings() {
    const savedSettings = wx.getStorageSync('app_settings') || {};
    this.setData({
      settings: {
        ...DEFAULT_SETTINGS,
        ...savedSettings
      }
    });
  },

  updateSwitch(e) {
    const field = e.currentTarget.dataset.field;
    const value = !!e.detail.value;
    const settings = {
      ...this.data.settings,
      [field]: value
    };

    this.setData({ settings });
    wx.setStorageSync('app_settings', settings);
  },

  clearMood() {
    wx.removeStorageSync('todayMood');
    wx.showToast({
      title: '今日心情已清空',
      icon: 'success'
    });
  },

  clearDraft() {
    wx.removeStorageSync('publish_draft');
    wx.showToast({
      title: '发布草稿已清空',
      icon: 'success'
    });
  },

  restoreDefaults() {
    wx.showModal({
      title: '恢复默认设置',
      content: '这会重置本地提醒和偏好设置，但不会删除你已经发布的内容。',
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync('app_settings', DEFAULT_SETTINGS);
        this.setData({ settings: DEFAULT_SETTINGS });
        wx.showToast({
          title: '已恢复默认设置',
          icon: 'success'
        });
      }
    });
  }
});
