import { isLoggedIn } from '../../utils/user';

const GACHA_POOL = [
  { rarity: 'R', title: '捶背 10 分钟券', desc: '不管今天多累，使用此券召唤一位专属按摩师傅为你捶背 10 分钟！' },
  { rarity: 'R', title: '今天你洗碗券', desc: '优雅地吃完饭，直接把碗筷推给对方，对方无权拒绝。' },
  { rarity: 'R', title: '叫声哥哥/姐姐券', desc: '向对方出示此券，可强行要求对方用最甜的声音叫一声哥哥或姐姐。' },
  { rarity: 'R', title: '下楼拿外卖券', desc: '周末不想下楼拿外卖？这张券就是你的免死金牌。' },
  { rarity: 'SR', title: '一次免费奶茶券', desc: '此券一出，对方须立刻为你点一杯你最爱喝的奶茶（超过 30 块需自己补差价）。' },
  { rarity: 'SR', title: '清空购物车一件券', desc: '指定购物车里的一件（合理范围内的）商品，由对方买单。' },
  { rarity: 'SR', title: '吵架无条件原谅券', desc: '不管谁的错，只要祭出此券，必须无条件和好，不能再翻旧账。' },
  { rarity: 'SSR', title: '周末你安排专属特权', desc: '本周末的所有吃喝玩乐行程都由对方做主，你只负责带上人跟着走！' },
  { rarity: 'SSR', title: '无条件答应一件事券', desc: '终极免死金牌，只要不犯法随时兑现，对方只能点头说好！' }
];

Page({
  data: {
    isShaking: false,
    hasPulledToday: false,
    showResult: false,
    resultCard: null
  },

  onShow() {
    this.checkDailyPull();
  },

  checkDailyPull() {
    const today = new Date().toDateString();
    const lastPullDate = wx.getStorageSync('gachaLastPullDate');
    if (lastPullDate === today) {
      this.setData({ hasPulledToday: true });
    }
  },

  pullGacha() {
    if (!isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    if (this.data.hasPulledToday) return;

    this.setData({ isShaking: true });

    // Simulate gacha delay
    setTimeout(() => {
      // Logic for random roll with basic weights
      const roll = Math.random();
      let drawnCard = null;
      if (roll < 0.05) { // 5% SSR
        drawnCard = GACHA_POOL.filter(c => c.rarity === 'SSR')[Math.floor(Math.random() * 2)];
      } else if (roll < 0.25) { // 20% SR
        drawnCard = GACHA_POOL.filter(c => c.rarity === 'SR')[Math.floor(Math.random() * 3)];
      } else { // 75% R
        drawnCard = GACHA_POOL.filter(c => c.rarity === 'R')[Math.floor(Math.random() * 4)];
      }

      this.setData({
        isShaking: false,
        resultCard: drawnCard,
        showResult: true,
        hasPulledToday: true
      });

      // Mark local storage pulled date
      wx.setStorageSync('gachaLastPullDate', new Date().toDateString());

      // Save to wallet
      const myCoupons = wx.getStorageSync('myCoupons') || [];
      myCoupons.unshift({
        ...drawnCard,
        id: 'coupon_' + Date.now() + Math.floor(Math.random() * 1000),
        acquiredAt: new Date().getTime(),
        used: false
      });
      wx.setStorageSync('myCoupons', myCoupons);
    }, 1500);
  },

  closeResult() {
    this.setData({ showResult: false });
  },

  goToWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' });
  }
});
