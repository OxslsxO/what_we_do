import { api } from '../../utils/api';
import { getUserId, isLoggedIn } from '../../utils/user';

const TEMPLATE_OPTIONS = [
  { id: 'ate', label: '吃过了' },
  { id: 'went', label: '去过了' },
  { id: 'shot', label: '拍到了' },
  { id: 'done', label: '完成了' },
  { id: 'responded', label: '被回应了' }
];

Page({
  data: {
    loggedIn: false,
    userId: '',
    module: '今天吃点啥',
    sourceModule: 'eat',
    templateType: 'ate',
    title: '',
    summary: '',
    content: '',
    relationId: '',
    actionId: '',
    tags: [],
    mediaList: [],
    templateOptions: TEMPLATE_OPTIONS
  },

  onLoad() {
    const draft = wx.getStorageSync('publish_draft') || {};
    wx.removeStorageSync('publish_draft');

    this.setData({
      loggedIn: isLoggedIn(),
      userId: getUserId(),
      module: draft.module || '今天吃点啥',
      sourceModule: draft.sourceModule || 'eat',
      templateType: draft.templateType || 'ate',
      title: draft.title || '',
      summary: draft.summary || '',
      content: draft.content || '',
      relationId: draft.relationId || '',
      actionId: draft.actionId || '',
      tags: draft.tags || []
    });
  },

  updateTitle(e) {
    this.setData({ title: e.detail.value });
  },

  updateSummary(e) {
    this.setData({ summary: e.detail.value });
  },

  updateContent(e) {
    this.setData({ content: e.detail.value });
  },

  selectTemplate(e) {
    this.setData({
      templateType: e.currentTarget.dataset.value
    });
  },

  chooseMedia() {
    wx.chooseMedia({
      count: 9 - this.data.mediaList.length,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const nextMedia = (res.tempFiles || []).map((file) => {
          const path = file.tempFilePath || '';
          const ext = path.split('.').pop().toLowerCase();
          const type =
            file.fileType === 'video' || ['mp4', 'mov', 'm4v'].includes(ext) ? 'video' : 'image';
          return {
            type,
            tempFilePath: path,
            url: path
          };
        });

        this.setData({
          mediaList: this.data.mediaList.concat(nextMedia)
        });
      }
    });
  },

  deleteMedia(e) {
    const index = e.currentTarget.dataset.index;
    const mediaList = [...this.data.mediaList];
    mediaList.splice(index, 1);
    this.setData({ mediaList });
  },

  fileToBase64(tempFilePath, mediaType) {
    return new Promise((resolve, reject) => {
      const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: (res) => {
          resolve(`data:${mimeType};base64,${res.data}`);
        },
        fail: reject
      });
    });
  },

  async publish() {
    if (!this.data.loggedIn || !this.data.userId) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    const { title, summary, content, mediaList, module, templateType, sourceModule, relationId, actionId, tags } =
      this.data;

    if (!title || !content) {
      wx.showToast({ title: '标题和内容都要填一下', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在发布' });

    try {
      const images = [];
      const videos = [];

      for (const media of mediaList) {
        const base64 = await this.fileToBase64(media.tempFilePath, media.type);
        if (media.type === 'video') {
          videos.push(base64);
        } else {
          images.push(base64);
        }
      }

      await api.createPost({
        author: this.data.userId,
        title,
        summary,
        content,
        images,
        videos,
        tags: tags && tags.length ? tags : [module],
        playType: module,
        templateType,
        sourceModule,
        relationId,
        actionId,
        status: 'published'
      });

      wx.hideLoading();
      wx.showToast({ title: '发布成功', icon: 'success' });
      wx.switchTab({ url: '/pages/discover/discover' });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: (error && error.message) || '发布失败',
        icon: 'none'
      });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
