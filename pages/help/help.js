Page({
  data: {
    faqs: [
      {
        title: '为什么有些功能还需要我补 key 才能完全跑起来？',
        answer: '因为 AI 生成、COS 存储、订阅消息这些能力都依赖你自己的正式配置。结构和代码我已经先接好了，后面把 key 填进去就能继续联调。'
      },
      {
        title: '为什么帖子、评论和关系动作是分开的？',
        answer: '这样主线更清晰：发现页负责看，帖子页负责展开，评论页负责互动，关系页负责双人动作和回忆沉淀。后面扩展时也更稳。'
      },
      {
        title: '现在最值得优先测试哪些流程？',
        answer: '建议先测首页 -> 吃 / 玩 / 拍 / 做 -> 发给 TA -> 关系页回应 -> 完成 -> 发帖 -> 发现页 -> 帖子详情 -> 评论区，这条主线是目前最重要的。'
      }
    ]
  },

  copyFeedbackInfo() {
    const text = [
      '今天干点啥 反馈模板',
      '问题页面：',
      '复现步骤：',
      '预期结果：',
      '实际结果：',
      '设备机型 / 微信版本：'
    ].join('\n');

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '反馈模板已复制',
          icon: 'success'
        });
      }
    });
  },

  goToRelation() {
    wx.switchTab({ url: '/pages/love/love' });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  }
});
