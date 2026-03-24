import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

const CARD_LIBRARY = [
  {
    title: '今天不开心没关系',
    scene: '情绪安抚卡',
    copy: '发这张卡片没别的原因，就是想告诉你：如果觉得累了，今天可以什么都不做。'
  },
  {
    title: '土味情话大放送',
    scene: '土味幽默卡',
    copy: '“你今天有点怪。”\n“哪里怪？”\n“怪可爱的。”'
  },
  {
    title: '深夜治愈时刻',
    scene: '深夜治愈卡',
    copy: '不用想明天还有多少事要做，今天的你已经很棒了。晚安。'
  },
  {
    title: '摸鱼提醒书',
    scene: '日常打气卡',
    copy: '提醒你一下，距下班又近了一点，记得喝水。'
  },
  {
    title: '我的开心分你一半',
    scene: '快乐共享卡',
    copy: '不管你现在感觉如何，这份开心我强制塞给你了。'
  }
];

Page({
  data: {
    relation: null,
    currentCard: CARD_LIBRARY[0],
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

  randomCard() {
    const randomIndex = Math.floor(Math.random() * CARD_LIBRARY.length);
    this.setData({
      currentCard: CARD_LIBRARY[randomIndex],
      latestAction: null
    });
  },

  sendCard() {
    const userId = getUserId();
    if (!this.data.relation || !userId) {
      wx.showToast({ title: '先建立关系再发送卡片', icon: 'none' });
      wx.switchTab({ url: '/pages/love/love' });
      return;
    }

    wx.showLoading({ title: '正在发送卡片' });
    requestActionSubscribe().then(() => {
      api.createRelationAction({
        relationId: this.data.relation._id,
        initiatorId: userId,
        module: 'laugh',
        type: 'laugh_share',
        title: `收到一张卡片：${this.data.currentCard.title}`,
        summary: this.data.currentCard.copy,
        message: `我给你发了一张情绪卡片，快看看：${this.data.currentCard.title}`,
        payload: this.data.currentCard
      })
        .then((res) => {
          wx.hideLoading();
          this.setData({
            latestAction: res.data.action
          });
          wx.showToast({ title: '卡片已发出', icon: 'success' });
        })
        .catch((err) => {
          wx.hideLoading();
          wx.showToast({
            title: (err && err.message) || '发送失败',
            icon: 'none'
          });
        });
    });
  }
});
