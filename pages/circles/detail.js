import { api } from '../../utils/api';
import { getUserId } from '../../utils/user';

Page({
  data: {
    circleId: '',
    circle: null,
    displayMembers: [],
    activeLines: [],
    statusBarHeight: 20,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragEnd: { x: 0, y: 0 },
    nodePositions: [], // 存储各个节点的中心坐标
    pollTimer: null
  },

  onLoad(options) {
    const sys = wx.getSystemInfoSync();
    this.setData({ 
      circleId: options.id,
      statusBarHeight: sys.statusBarHeight 
    });
    this.refreshCircle();
    this.startPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  refreshCircle() {
    const uid = getUserId();
    api.getCircles(uid).then(res => {
      const circle = res.data.find(c => c._id === this.data.circleId);
      if (circle) {
        // 补全四人位，如果是空位则放置占位符
        let display = [...circle.members];
        while (display.length < 4) {
          display.push({ user: { userInfo: { name: '等待加入', avatar: '/assets/placeholder.png' } }, isPlaceholder: true });
        }
        this.setData({ circle, displayMembers: display }, () => {
          this.calculateNodePositions();
        });
      }
    });
  },

  calculateNodePositions() {
    const query = wx.createSelectorQuery();
    query.selectAll('.node-wrapper').boundingClientRect();
    query.select('.canvas-area').boundingClientRect();
    query.exec(res => {
      const nodes = res[0];
      const canvas = res[1];
      if (!nodes || !canvas) return;

      const positions = nodes.map(n => ({
        x: n.left + n.width / 2,
        y: n.top + n.height / 2 - canvas.top
      }));
      this.setData({ nodePositions: positions });
    });
  },

  onNodeTouchStart(e) {
    const idx = e.currentTarget.dataset.index;
    const member = this.data.displayMembers[idx];
    if (member.isPlaceholder || member.user._id !== getUserId()) return;

    const pos = this.data.nodePositions[idx];
    this.setData({
      isDragging: true,
      dragStart: pos,
      dragEnd: pos,
      startIdx: idx
    });
  },

  onNodeTouchMove(e) {
    if (!this.data.isDragging) return;
    const touch = e.touches[0];
    const query = wx.createSelectorQuery();
    query.select('.canvas-area').boundingClientRect().exec(res => {
      const canvas = res[0];
      this.setData({
        dragEnd: { x: touch.clientX, y: touch.clientY - canvas.top }
      });
    });
  },

  onNodeTouchEnd(e) {
    if (!this.data.isDragging) return;
    
    // 检查落点是否在其他节点上
    const { dragEnd, nodePositions, displayMembers, startIdx } = this.data;
    let targetIdx = -1;
    
    nodePositions.forEach((pos, idx) => {
      const dist = Math.sqrt(Math.pow(pos.x - dragEnd.x, 2) + Math.pow(pos.y - dragEnd.y, 2));
      if (dist < 40 && idx !== startIdx && !displayMembers[idx].isPlaceholder) {
        targetIdx = idx;
      }
    });

    if (targetIdx !== -1) {
      this.sendInteraction(displayMembers[targetIdx].user._id);
    }

    this.setData({ isDragging: false });
  },

  sendInteraction(toUserId) {
    api.interactCircle({
      circleId: this.data.circleId,
      fromUser: getUserId(),
      toUser: toUserId,
      actionType: 'line_connect'
    }).then(() => {
      wx.vibrateShort();
      this.fetchInteractions();
    });
  },

  fetchInteractions() {
    api.getCircleInteractions(this.data.circleId).then(res => {
      const interactions = res.data;
      const { displayMembers, nodePositions } = this.data;
      
      const lines = interactions.map(it => {
        const fromIdx = displayMembers.findIndex(m => m.user._id === it.fromUser);
        const toIdx = displayMembers.findIndex(m => m.user?._id === it.toUsers[0]);
        if (fromIdx !== -1 && toIdx !== -1) {
          return {
            ...it,
            fromPos: nodePositions[fromIdx],
            toPos: nodePositions[toIdx]
          };
        }
        return null;
      }).filter(l => l);

      this.setData({ activeLines: lines });
    });
  },

  startPolling() {
    this.fetchInteractions();
    this.setData({
      pollTimer: setInterval(() => this.fetchInteractions(), 3000)
    });
  },

  stopPolling() {
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
  },

  goBack() { wx.navigateBack(); },
  inviteFriend() {
    wx.showModal({
      title: '邀请加入',
      content: `把圈子ID [${this.data.circleId.slice(-6)}] 发给好友，或分享此页面让 TA 加入。`,
      showCancel: false
    });
  },
  onHubClick() {
    const { circleId, circle } = this.data;
    wx.showActionSheet({
      itemList: ['往扭蛋机扔愿望', '开启今日随机决策'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.addWish();
        } else {
          this.spinGacha();
        }
      }
    });
  },
  addWish() {
    wx.showInput({
      title: '写下想做的事',
      placeholder: '比如：去吃那家寿喜烧',
      confirmText: '扔进去',
      success: (val) => {
        if (!val) return;
        api.request({
          url: '/api/circle/gacha/add',
          method: 'POST',
          data: { circleId: this.data.circleId, wish: val }
        }).then(() => wx.showToast({ title: '已入池' }));
      }
    });
  },
  spinGacha() {
    api.request({
      url: '/api/circle/gacha/spin',
      method: 'POST',
      data: { circleId: this.data.circleId, userId: getUserId() }
    }).then(res => {
      wx.showModal({
        title: '🎉 选中啦！',
        content: `大家今天一起：${res.data}`,
        showCancel: false
      });
      this.fetchInteractions();
    }).catch(err => wx.showToast({ title: err.message, icon: 'none' }));
  }
});
