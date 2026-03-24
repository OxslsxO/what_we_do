const TEMPLATE_IDS = {
  // 占位符，后续在微信公众平台申请后填入
  ACTION_INVITE: 'TMPL_ID_ACTION_INVITE',
  ACTION_RESPONSE: 'TMPL_ID_ACTION_RESPONSE',
  RELATION_INVITE: 'TMPL_ID_RELATION_INVITE'
};

/**
 * 封装微信订阅消息请求
 * @param {string[]} tmplIds - 模板 ID 数组
 * @returns {Promise<boolean>}
 */
function requestSubscribe(tmplIds = []) {
  return new Promise((resolve) => {
    // 基础库版本兼容检查
    if (!wx.requestSubscribeMessage) {
      resolve(true); // 兼容旧版，直接放行
      return;
    }

    if (!tmplIds || !tmplIds.length) {
      resolve(true);
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds,
      success(res) {
        // 即使用户拒绝（reject），依然让业务逻辑继续往下走
        // 这里可以针对 accept 的模板 ID 集中上报或者本地记录
        resolve(true);
      },
      fail(err) {
        // 请求失败（通常是没权限/模板ID不对），不阻塞业务
        console.warn('requestSubscribeMessage fail:', err);
        resolve(true);
      }
    });
  });
}

/**
 * 快捷请求：交互动作相关的订阅通知
 */
function requestActionSubscribe() {
  return requestSubscribe([
    TEMPLATE_IDS.ACTION_INVITE,
    TEMPLATE_IDS.ACTION_RESPONSE
  ]);
}

/**
 * 快捷请求：关系邀请相关的订阅通知
 */
function requestRelationSubscribe() {
  return requestSubscribe([
    TEMPLATE_IDS.RELATION_INVITE
  ]);
}

module.exports = {
  TEMPLATE_IDS,
  requestSubscribe,
  requestActionSubscribe,
  requestRelationSubscribe
};
