import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';
import { requestActionSubscribe } from '../../utils/subscribe';

const FOOD_LIBRARY = [
  {
    name: '番茄肥牛饭',
    budget: 'mid',
    scene: 'dinner',
    tags: ['热乎', '稳妥', '下饭'],
    reason: '酸甜口很稳，下班后最适合来一份不费脑子的满足。'
  },
  {
    name: '黄焖鸡米饭',
    budget: 'mid',
    scene: 'work',
    tags: ['工作餐', '浓香', '饱腹'],
    reason: '如果今天很忙，这种浓香又不容易出错的饭最适合救场。'
  },
  {
    name: '寿司拼盘',
    budget: 'high',
    scene: 'date',
    tags: ['约会', '轻盈', '分享感'],
    reason: '适合两个人一起吃，选择多，拍照和分享感也都很好。'
  },
  {
    name: '烤肉拌饭',
    budget: 'mid',
    scene: 'dinner',
    tags: ['香气重', '满足感', '晚饭'],
    reason: '今天如果想要一点很直接的快乐，肉香就是最短路径。'
  },
  {
    name: '轻食沙拉',
    budget: 'mid',
    scene: 'solo',
    tags: ['轻负担', '中午', '清爽'],
    reason: '想吃得轻一点的时候，清爽的选择更容易让下午保持清醒。'
  },
  {
    name: '牛肉拉面',
    budget: 'low',
    scene: 'solo',
    tags: ['热汤', '低决策成本', '一人食'],
    reason: '不想费脑的时候，一碗热汤面就是最快能安顿自己的方式。'
  },
  {
    name: '双人火锅',
    budget: 'high',
    scene: 'date',
    tags: ['约会', '仪式感', '一起吃'],
    reason: '今天如果想把吃饭变成约会，那就选一个能慢慢聊的项目。'
  },
  {
    name: '韩式炸鸡',
    budget: 'mid',
    scene: 'date',
    tags: ['分享', '快乐感', '夜晚'],
    reason: '适合想轻松一点的时候，边吃边聊天，氛围会更自然。'
  },
  {
    name: '咖喱鸡排饭',
    budget: 'mid',
    scene: 'work',
    tags: ['浓郁', '治愈', '工作日'],
    reason: '香气够足，稳定又有安慰感，很适合疲惫的一天。'
  },
  {
    name: '麻辣香锅',
    budget: 'high',
    scene: 'dinner',
    tags: ['重口', '释放压力', '晚餐'],
    reason: '如果今天想吃点有冲击力的，这种味型最容易让情绪抬起来。'
  },
  {
    name: '煎饺套餐',
    budget: 'low',
    scene: 'work',
    tags: ['省心', '便捷', '午餐'],
    reason: '预算友好、效率高，适合忙碌日的快速补能。'
  },
  {
    name: '日式乌冬面',
    budget: 'mid',
    scene: 'soft',
    tags: ['柔和', '热汤', '舒缓'],
    reason: '适合需要一点被照顾感的时候，热乎又不刺激。'
  },
  {
    name: '酸菜鱼',
    budget: 'high',
    scene: 'date',
    tags: ['适合分享', '有记忆点', '聚餐'],
    reason: '两个人一起吃更有气氛，也更容易变成今天的共同记忆。'
  },
  {
    name: '照烧鸡腿饭',
    budget: 'mid',
    scene: 'dinner',
    tags: ['稳妥', '甜咸平衡', '高接受度'],
    reason: '如果今天谁都不想踩雷，选这种普遍接受度高的就很稳。'
  },
  {
    name: '汉堡薯条套餐',
    budget: 'mid',
    scene: 'date',
    tags: ['轻松', '分享', '随手快乐'],
    reason: '想把气氛放轻一点的时候，简单快乐的食物反而更对味。'
  },
  {
    name: '三明治配咖啡',
    budget: 'low',
    scene: 'work',
    tags: ['效率', '午后', '轻便'],
    reason: '适合忙碌工作日，不会太撑，也能快速恢复一点状态。'
  }
];

const BUDGET_OPTIONS = [
  { id: 'all', label: '不限预算' },
  { id: 'low', label: '省一点' },
  { id: 'mid', label: '刚刚好' },
  { id: 'high', label: '吃顿好的' }
];

const SCENE_OPTIONS = [
  { id: 'all', label: '所有场景' },
  { id: 'work', label: '工作餐' },
  { id: 'date', label: '约会' },
  { id: 'solo', label: '一人食' },
  { id: 'dinner', label: '晚饭' },
  { id: 'soft', label: '被治愈' }
];

Page({
  data: {
    loggedIn: false,
    userId: '',
    relation: null,
    budgetOptions: BUDGET_OPTIONS,
    sceneOptions: SCENE_OPTIONS,
    selectedBudget: 'all',
    selectedScene: 'all',
    currentPick: null,
    loadingPick: false,
    latestAction: null,
    showActionModal: false,
    actionForm: {
      receiverName: '',
      phone: '',
      address: '',
      note: '',
      message: '',
      responseMode: 'treat'
    }
  },

  onShow() {
    this.setData({
      loggedIn: isLoggedIn(),
      userId: getUserId()
    });
    this.loadRelation();
  },

  loadRelation() {
    if (!this.data.userId) {
      this.setData({ relation: null });
      return;
    }

    api.getCurrentRelation(this.data.userId)
      .then((res) => {
        const data = res.data || {};
        this.setData({
          relation: data.relation || null
        });
      })
      .catch(() => {
        this.setData({ relation: null });
      });
  },

  selectBudget(e) {
    this.setData({
      selectedBudget: e.currentTarget.dataset.value
    });
  },

  selectScene(e) {
    this.setData({
      selectedScene: e.currentTarget.dataset.value
    });
  },

  getFilteredFoods() {
    const { selectedBudget, selectedScene } = this.data;
    return FOOD_LIBRARY.filter((item) => {
      const budgetPass = selectedBudget === 'all' || item.budget === selectedBudget;
      const scenePass = selectedScene === 'all' || item.scene === selectedScene;
      return budgetPass && scenePass;
    });
  },

  generateFood() {
    const pool = this.getFilteredFoods();
    if (!pool.length) {
      wx.showToast({ title: '当前筛选下暂无推荐', icon: 'none' });
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const pick = pool[randomIndex];
    const requestToken = `${Date.now()}_${pick.name}`;
    this.currentPickToken = requestToken;

    this.setData({
      loadingPick: true,
      currentPick: {
        ...pick,
        imageUrl: '',
        recipe: ''
      },
      latestAction: null
    });

    Promise.all([this.wrapApiResult(api.generateFoodImage(pick.name)), this.wrapApiResult(api.generateFoodRecipe(pick.name))])
      .then((results) => {
        if (this.currentPickToken !== requestToken) return;

        const imageRes = results[0];
        const recipeRes = results[1];
        const currentPick = {
          ...pick,
          imageUrl:
            imageRes.success && imageRes.data
              ? imageRes.data.imageUrl
              : '',
          recipe:
            recipeRes.success && recipeRes.data
              ? recipeRes.data.content
              : this.getFallbackRecipe(pick.name)
        };

        this.setData({
          loadingPick: false,
          currentPick
        });
      })
      .catch(() => {
        if (this.currentPickToken !== requestToken) return;
        this.setData({
          loadingPick: false,
          currentPick: {
            ...pick,
            imageUrl: '',
            recipe: this.getFallbackRecipe(pick.name)
          }
        });
      });
  },

  wrapApiResult(promise) {
    return promise
      .then((res) => ({ success: true, data: res.data }))
      .catch(() => ({ success: false, data: null }));
  },

  getFallbackRecipe(foodName) {
    return `# ${foodName}\n\n## 今天为什么适合它\n- 这是一份低决策成本、容易获得满足感的选择。\n- 如果你不知道今天吃什么，先把“好好吃一顿”完成掉。\n\n## 建议吃法\n1. 如果是一个人吃，就选离你最近、评分稳定的店。\n2. 如果想发给 TA，就顺手把地址和想说的话一起带上。\n3. 吃完后，记一句今天的感受，回忆会更具体。`;
  },

  ensurePick() {
    if (this.data.currentPick) return true;
    wx.showToast({ title: '先随机出今天的推荐', icon: 'none' });
    return false;
  },

  openActionModal() {
    if (!this.ensurePick()) return;
    if (!this.data.relation) {
      wx.showToast({ title: '先建立关系再发给 TA', icon: 'none' });
      wx.switchTab({ url: '/pages/love/love' });
      return;
    }

    this.setData({
      showActionModal: true,
      actionForm: {
        receiverName: '',
        phone: '',
        address: '',
        note: '',
        message: `今天我想吃 ${this.data.currentPick.name}，你要不要一起参与一下？`,
        responseMode: 'treat'
      }
    });
  },

  closeActionModal() {
    this.setData({ showActionModal: false });
  },

  updateActionForm(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`actionForm.${field}`]: e.detail.value
    });
  },

  selectResponseMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      'actionForm.responseMode': mode
    });
  },

  submitEatAction() {
    if (!this.ensurePick()) return;
    if (!this.data.relation) {
      wx.showToast({ title: '当前还没有可用关系', icon: 'none' });
      return;
    }

    const { currentPick, actionForm, relation, userId } = this.data;

    wx.showLoading({ title: '正在发给 TA' });

    requestActionSubscribe().then(() => {
      api.createRelationAction({
      relationId: relation._id,
      initiatorId: userId,
      module: 'eat',
      type: 'eat_share',
      title: `今天想吃 ${currentPick.name}`,
      summary: `${currentPick.reason}，想看看 TA 会怎么回应。`,
      message: actionForm.message,
      payload: {
        foodName: currentPick.name,
        tags: currentPick.tags,
        reason: currentPick.reason,
        receiverName: actionForm.receiverName,
        phone: actionForm.phone,
        address: actionForm.address,
        note: actionForm.note,
        responseMode: actionForm.responseMode
      }
    })
      .then((res) => {
        wx.hideLoading();
        this.setData({
          latestAction: res.data.action,
          showActionModal: false
        });
        wx.showToast({ title: '已经发给 TA', icon: 'success' });
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

  initiateChallenge() {
    if (!this.ensurePick()) return;
    if (!this.data.relation) return;

    wx.showLoading({ title: 'AI 正在准备挑战' });
    
    api.getChallengeQuestions({
      foodName: this.data.currentPick.name,
      relationType: this.data.relation.type
    })
    .then(res => {
      const challenge = res.data.challenge;
      
      return api.createRelationAction({
        relationId: this.data.relation._id,
        initiatorId: this.data.userId,
        module: 'eat',
        type: 'eat_challenge',
        title: '【投喂挑战】猜猜我要吃什么',
        summary: challenge.question,
        payload: {
          foodName: this.data.currentPick.name,
          question: challenge.question,
          hint: challenge.options ? challenge.options.join(' / ') : ''
        }
      });
    })
    .then(res => {
      wx.hideLoading();
      this.setData({
        latestAction: res.data.action
      });
      wx.showToast({ title: '挑战已发起！', icon: 'success' });
    })
    .catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '发起失败', icon: 'none' });
    });
  },

  completeLatestAction() {
    const { latestAction, currentPick, userId } = this.data;
    if (!latestAction || !currentPick) {
      wx.showToast({ title: '当前没有可完成的动作', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在收进回忆' });
    api.completeRelationAction({
      actionId: latestAction._id,
      userId,
      templateType: 'ate',
      title: `今天吃到了 ${currentPick.name}`,
      summary: `这顿 ${currentPick.name} 已经从想法变成了今天真实发生的事。`,
      content: currentPick.recipe,
      mediaList: currentPick.imageUrl ? [currentPick.imageUrl] : []
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已经记下来了', icon: 'success' });
        this.loadRelation();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || '记录失败',
          icon: 'none'
        });
      });
  },

  goToMeituan() {
    if (!this.ensurePick()) return;
    const keyword = encodeURIComponent(this.data.currentPick.name);
    wx.navigateTo({
      url: `/pages/webview/webview?url=https://www.meituan.com/search/?keyword=${keyword}`
    });
  },

  goToPublish() {
    if (!this.ensurePick()) return;
    const { currentPick, relation, latestAction } = this.data;

    wx.setStorageSync('publish_draft', {
      title: `今天吃到了 ${currentPick.name}`,
      content: `${currentPick.reason}\n\n${currentPick.recipe || ''}`,
      module: '今天吃点啥',
      templateType: 'ate',
      sourceModule: 'eat',
      summary: `${currentPick.name} 被正式收进今天的记录里。`,
      relationId: relation ? relation._id : '',
      actionId: latestAction ? latestAction._id : '',
      tags: currentPick.tags || []
    });

    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  stopPropagation() {}
});
