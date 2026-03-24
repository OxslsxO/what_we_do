import { getStoredUser, isLoggedIn } from '../../utils/user';

const DEFAULT_USER = {
  avatar: 'https://img.icons8.com/ios-filled/100/000000/user.png',
  name: '今天的用户',
  desc: '把今天过得更具体一点，也更温柔一点。',
  activities: 0,
  friends: 0,
  points: 0
};

Page({
  data: {
    loggedIn: false,
    userInfo: DEFAULT_USER
  },

  onShow() {
    this.loadUserProfile();
  },

  loadUserProfile() {
    const user = getStoredUser();
    const loggedIn = isLoggedIn();
    const userInfo = user && user.userInfo ? user.userInfo : DEFAULT_USER;

    this.setData({
      loggedIn,
      userInfo: {
        ...DEFAULT_USER,
        ...userInfo
      }
    });
  },

  ensureLogin() {
    if (this.data.loggedIn) return true;
    wx.navigateTo({ url: '/pages/login/login' });
    return false;
  },

  goToEditProfile() {
    if (!this.ensureLogin()) return;
    wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
  },

  goToMyPosts() {
    if (!this.ensureLogin()) return;
    wx.navigateTo({ url: '/pages/my-posts/my-posts' });
  },

  goToSaved() {
    if (!this.ensureLogin()) return;
    wx.navigateTo({ url: '/pages/save/save' });
  },

  goToLiked() {
    if (!this.ensureLogin()) return;
    wx.switchTab({ url: '/pages/love/love' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goToHelp() {
    wx.navigateTo({ url: '/pages/help/help' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  logout() {
    if (!this.data.loggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    wx.showModal({
      title: '退出登录',
      content: '确认退出后，本地登录信息会被清掉，但你已经生成的记录还会保留在账号里。',
      success: (res) => {
        if (!res.confirm) return;

        wx.removeStorageSync('token');
        wx.removeStorageSync('user');
        this.setData({
          loggedIn: false,
          userInfo: DEFAULT_USER
        });
        wx.navigateTo({ url: '/pages/login/login' });
      }
    });
  }
});
