import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

const TASK_LIBRARY = [
  {
    title: '一起去吃一家没吃过的小店',
    duration: '90 分钟',
    scene: '约会感',
    copy: '适合把今天变得稍微不一样一点，重点不是大计划，而是一起完成。'
  },
  {
    title: '一起走 5000 步',
    duration: '40 分钟',
    scene: '低成本快乐',
    copy: '不需要准备，但很适合让关系重新流动起来。'
  },
  {
    title: '一起拍 3 张今天的照片',
    duration: '30 分钟',
    scene: '回忆型任务',
    copy: '完成以后，今天会立刻多出一点值得回看的东西。'
  },
  {
    title: '给对方写一句今天的感谢',
    duration: '10 分钟',
    scene: '关系修复',
    copy: '越是轻的小动作，越容易长期留下温度。'
  },
  {
    title: '一起整理 10 分钟房间',
    duration: '10 分钟',
    scene: '生活感',
    copy: '不夸张，但很像真正的共同生活，会很有参与感。'
  },
  {
    title: '一起完成一次深夜便利店散步',
    duration: '30 分钟',
    scene: '夜晚仪式感',
    copy: '适合没太多精力的晚上，小小出门也能重新点亮一天。'
  }
];

Page({
  data: {
    relation: null,
    currentTask: TASK_LIBRARY[0],
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

  randomTask() {
    const randomIndex = Math.floor(Math.random() * TASK_LIBRARY.length);
    this.setData({
      currentTask: TASK_LIBRARY[randomIndex],
      latestAction: null
    });
  },

  sendTask() {
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
        module: 'daily',
        type: 'daily_task',
        title: `今天一起：${this.data.currentTask.title}`,
        summary: this.data.currentTask.copy,
        message: `我想和你一起完成这个小任务：${this.data.currentTask.title}`,
        payload: this.data.currentTask
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
