// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 这里可以添加发送通知的逻辑
    // 例如发送模板消息、订阅消息等
    console.log('收到订单信息:', event)
    
    // 模拟发送成功
    return {
      success: true,
      message: '通知发送成功'
    }
  } catch (error) {
    console.error('发送通知失败:', error)
    return {
      success: false,
      message: '通知发送失败'
    }
  }
}