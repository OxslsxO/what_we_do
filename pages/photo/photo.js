import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

const PHOTO_LIBRARY = [
  {
    title: '拍一张下班路上的暖光',
    tip: '找有阳光、路灯或橱窗反光的位置，画面会天然更柔和。',
    scene: '日常感'
  },
  {
    title: '拍一张“我在等你”',
    tip: '让人物稍微背对镜头，留一点空间，故事感会更强。',
    scene: '关系感'
  },
  {
    title: '拍一张今天一起吃的那一口',
    tip: '靠近一点，保留一点手部动作，生活感会比摆拍更真实。',
    scene: '吃与记录'
  },
  {
    title: '拍城市里的绿色角落',
    tip: '把绿色和建筑放在同一画面里，会有很舒服的呼吸感。',
    scene: 'city walk'
  },
  {
    title: '拍一张有故事感的背影',
    tip: '让主体不要站正中，稍微偏一点，画面会更像在讲一件事。',
    scene: '氛围感'
  }
];

Page({
  data: {
    relation: null,
    currentIdea: PHOTO_LIBRARY[0],
    latestAction: null
  },

  onShow() {
    this.loadRelation();
  },

  loadRelation() {
    const userId = getUserId();
    if (!isLoggedIn() || !userId) {
      this.setData({ relation: null });
      return;
    }

    api.getCurrentRelation(userId)
      .then((res) => {
        this.setData({
          relation: (res.data && res.data.relation) || null
        });
      })
      .catch(() => {
        this.setData({ relation: null });
      });
  },

  randomIdea() {
    const randomIndex = Math.floor(Math.random() * PHOTO_LIBRARY.length);
    this.setData({
      currentIdea: PHOTO_LIBRARY[randomIndex],
      latestAction: null
    });
  },

  sendPhotoTask() {
    const userId = getUserId();
    if (!this.data.relation || !userId) {
      wx.showToast({ title: '先建立关系再发起任务', icon: 'none' });
      wx.switchTab({ url: '/pages/love/love' });
      return;
    }

    wx.showLoading({ title: '正在发起任务' });
    requestActionSubscribe().then(() => {
      api.createRelationAction({
      relationId: this.data.relation._id,
      initiatorId: userId,
      module: 'photo',
      type: 'photo_task',
      title: `今天一起拍：${this.data.currentIdea.title}`,
      summary: this.data.currentIdea.tip,
      message: `我想和你一起完成这个拍照任务：${this.data.currentIdea.title}`,
      payload: this.data.currentIdea
    })
      .then((res) => {
        wx.hideLoading();
        this.setData({
          latestAction: res.data.action
        });
        wx.showToast({ title: '任务已发出', icon: 'success' });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '发起失败',
          icon: 'none'
        });
      });
    });
  }
});
