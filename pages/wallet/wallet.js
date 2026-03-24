import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

Page({
  data: {
    coupons: [],
    relation: null
  },

  onShow() {
    this.loadCoupons();
    this.loadRelation();
  },

  loadCoupons() {
    const rawCoupons = wx.getStorageSync('myCoupons') || [];
    const formatted = rawCoupons.map(c => ({
      ...c,
      dateString: new Date(c.acquiredAt).toLocaleDateString()
    }));
    this.setData({ coupons: formatted });
  },

  loadRelation() {
    const userId = getUserId();
    if (!isLoggedIn() || !userId) return;

    api.getCurrentRelation(userId)
      .then((res) => {
        this.setData({
          relation: (res.data && res.data.relation) || null
        });
      })
      .catch(() => {});
  },

  useCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    const coupon = this.data.coupons.find(c => c.id === couponId);
    if (!coupon || coupon.used) return;

    if (!this.data.relation) {
      wx.showToast({ title: '先建立关系才能核销哦', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认核销特权券',
      content: `确定要向 TA 发送【${coupon.title}】的核销请求吗？对方收到后将必须执行。`,
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '正在出示特权卡' });
        requestActionSubscribe().then(() => {
          api.createRelationAction({
            relationId: this.data.relation._id,
            initiatorId: getUserId(),
            module: 'gacha',
            type: 'coupon_redeem',
            title: `使用特权：${coupon.title}`,
            summary: coupon.desc,
            message: `我正在对你使用一张特权券：【${coupon.title}】！快点乖乖执行！`,
            payload: { couponId: coupon.id, rarity: coupon.rarity }
          })
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '核销请求已送达', icon: 'success' });
              
              // Mark local coupon as used
              const rawCoupons = wx.getStorageSync('myCoupons') || [];
              const target = rawCoupons.find(c => c.id === couponId);
              if (target) {
                target.used = true;
                wx.setStorageSync('myCoupons', rawCoupons);
              }
              this.loadCoupons();
            })
            .catch((err) => {
              wx.hideLoading();
              wx.showToast({ title: (err && err.message) || '核销失败', icon: 'none' });
            });
        });
      }
    });
  }
});
