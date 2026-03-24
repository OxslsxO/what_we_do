import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

const PLAY_LIBRARY = [
  {
    title: '附近找一家安静咖啡店',
    duration: '60-90 分钟',
    budget: '50 元内',
    vibe: '轻约会',
    copy: '适合下班后慢慢坐一会，把今天从工作模式切回生活模式。'
  },
  {
    title: '今晚散步 5000 步',
    duration: '40 分钟',
    budget: '0 元',
    vibe: '低成本快乐',
    copy: '不需要复杂安排，但很适合让两个人重新找回说话的节奏。'
  },
  {
    title: '周末看一场展览',
    duration: '2 小时',
    budget: '100 元内',
    vibe: '约会感',
    copy: '如果想要一点新鲜感，展览是很适合开话题的轻体验。'
  },
  {
    title: '去公园野餐',
    duration: '半天',
    budget: '80 元内',
    vibe: '自然感',
    copy: '适合天气好的时候，把吃、拍、散步串成一整段轻松时光。'
  },
  {
    title: '一起逛超市做晚饭',
    duration: '2 小时',
    budget: '100 元内',
    vibe: '日常浪漫',
    copy: '不是大项目，但很容易留下“像生活”的那种温度。'
  },
  {
    title: '选一家小店盲探',
    duration: '90 分钟',
    budget: '80 元内',
    vibe: '探索感',
    copy: '适合不想太计划，但又想让今天稍微有点未知和惊喜。'
  }
];

Page({
  data: {
    relation: null,
    currentIdea: PLAY_LIBRARY[0],
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
    const randomIndex = Math.floor(Math.random() * PLAY_LIBRARY.length);
    this.setData({
      currentIdea: PLAY_LIBRARY[randomIndex],
      latestAction: null
    });
  },

  sendToRelation() {
    const userId = getUserId();
    if (!this.data.relation || !userId) {
      wx.showToast({ title: '先建立关系再发起邀约', icon: 'none' });
      wx.switchTab({ url: '/pages/love/love' });
      return;
    }

    wx.showLoading({ title: '正在发起邀约' });
    requestActionSubscribe().then(() => {
      api.createRelationAction({
      relationId: this.data.relation._id,
      initiatorId: userId,
      module: 'play',
      type: 'date_invite',
      title: `今天想一起：${this.data.currentIdea.title}`,
      summary: this.data.currentIdea.copy,
      message: `我想和你一起去：${this.data.currentIdea.title}`,
      payload: this.data.currentIdea
    })
      .then((res) => {
        wx.hideLoading();
        this.setData({
          latestAction: res.data.action
        });
        wx.showToast({ title: '邀约已发出', icon: 'success' });
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '发起失败',
          icon: 'none'
        });
      });
    });
  },

  initiatePoll() {
    const userId = getUserId();
    if (!this.data.relation || !userId) return;

    // 随机选 3 个不重复的
    const shuffled = [...PLAY_LIBRARY].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 3).map(item => ({
      name: item.title,
      votes: 0
    }));

    wx.showLoading({ title: '正在发起投票' });
    api.createRelationAction({
      relationId: this.data.relation._id,
      initiatorId: userId,
      module: 'play',
      type: 'date_poll',
      title: '✨ 选一个作为我们今晚/周末的活动吧',
      summary: '投票选出大家都想去的那一个，选好后我们就出发！',
      payload: { options, votes: {} }
    })
    .then(res => {
      wx.hideLoading();
      this.setData({
        latestAction: res.data.action
      });
      wx.showToast({ title: '投票已发起', icon: 'success' });
    })
    .catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '发起失败', icon: 'none' });
    });
  }
});
