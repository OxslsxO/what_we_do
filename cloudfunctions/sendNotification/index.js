const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const EVENT_TITLES = {
  relation_invite: '关系邀请',
  relation_response: '关系回应',
  relation_action: '动作提醒',
  relation_complete: '动作完成'
};

exports.main = async (event) => {
  try {
    const {
      eventType = 'relation_action',
      receiverOpenId = '',
      title = '',
      content = '',
      payload = {},
      dryRun = true
    } = event || {};

    const finalTitle = title || EVENT_TITLES[eventType] || '系统通知';
    const finalContent = content || '你有一条新的关系动态待查看。';

    if (!receiverOpenId && !dryRun) {
      return {
        success: false,
        message: '缺少接收者 openId，无法发送正式通知'
      };
    }

    const notificationRecord = {
      eventType,
      title: finalTitle,
      content: finalContent,
      receiverOpenId,
      payload,
      dryRun,
      createdAt: new Date().toISOString()
    };

    console.log('sendNotification payload =>', notificationRecord);

    return {
      success: true,
      message: dryRun ? '通知预演成功，等待接入正式模板 ID' : '通知已发送',
      data: notificationRecord
    };
  } catch (error) {
    console.error('sendNotification error =>', error);
    return {
      success: false,
      message: '通知处理失败',
      error: error && error.message ? error.message : 'unknown error'
    };
  }
};
