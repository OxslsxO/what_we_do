import { api } from '../../utils/api';
import { getUserId } from '../../utils/user';

Page({
  data: {
    circles: [],
    showCreate: false,
    newName: ''
  },
  onShow() {
    this.loadCircles();
  },
  loadCircles() {
    const uid = getUserId();
    if (!uid) return;
    api.getCircles(uid).then(res => {
      this.setData({ circles: res.data });
    });
  },
  showCreateModal() { this.setData({ showCreate: true }); },
  hideCreateModal() { this.setData({ showCreate: false }); },
  onNameInput(e) { this.setData({ newName: e.detail.value }); },
  createCircle() {
    const uid = getUserId();
    if (!this.data.newName) return;
    api.createCircle({ name: this.data.newName, userId: uid }).then(() => {
      this.hideCreateModal();
      this.loadCircles();
    });
  },
  goToCircle(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/circles/detail?id=${id}` });
  }
});
