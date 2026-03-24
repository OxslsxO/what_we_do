// API工具类
import { baseUrl } from '../config/api';

/**
 * 封装API请求
 * @param {Object} options - 请求参数
 * @param {string} options.url - API路径
 * @param {string} options.method - 请求方法
 * @param {Object} options.data - 请求数据
 * @returns {Promise} - 返回Promise对象
 */
export function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      success: (res) => {
        if (res.data.success) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// 导出常用API方法
export const api = {
  // 帖子相关
  getPosts: (params) => request({ url: '/api/post/feed', method: 'GET', data: params }),
  getMyPosts: (params) => request({ url: '/api/post/my', method: 'GET', data: params }),
  getCollectedPosts: (params) => request({ url: '/api/post/user/collections', method: 'GET', data: params }),
  createPost: (data) => request({ url: '/api/post/create', method: 'POST', data }),
  toggleLikePost: (postId, userId) => request({ url: '/api/post/like', method: 'POST', data: { postId, userId } }),
  toggleCollectPost: (postId, userId) => request({ url: '/api/post/collect', method: 'POST', data: { postId, userId } }),
  sharePost: (postId, userId) => request({ url: '/api/post/share', method: 'POST', data: { postId, userId } }),
  likePost: (postId, userId) => request({ url: `/api/post/${postId}/like`, method: 'POST', data: { userId } }),
  unlikePost: (postId, userId) => request({ url: `/api/post/${postId}/unlike`, method: 'POST', data: { userId } }),
  collectPost: (postId, userId) => request({ url: `/api/post/${postId}/collect`, method: 'POST', data: { userId } }),
  uncollectPost: (postId, userId) => request({ url: `/api/post/${postId}/uncollect`, method: 'POST', data: { userId } }),
  getPostDetail: (postId) => request({ url: `/api/post/${postId}`, method: 'GET' }),
  getComments: (postId, params) => request({ url: `/api/post/${postId}/comments`, method: 'GET', data: params }),
  addComment: (postId, data) => request({ url: `/api/post/${postId}/comment`, method: 'POST', data }),
  
  // 标签相关
  getHotTags: () => request({ url: '/api/post/tags/hot', method: 'GET' }),
  
  // 用户交互相关
  getUserInteractions: (userId) => request({ url: '/api/post/user/interactions', method: 'GET', data: { userId } }),

  // 关系系统相关
  getRelationDashboard: (userId) =>
    request({ url: '/api/relation/dashboard', method: 'GET', data: { userId } }),
  getCurrentRelation: (userId) =>
    request({ url: '/api/relation/current', method: 'GET', data: { userId } }),
  getRelationTimeline: (userId) =>
    request({ url: '/api/relation/timeline', method: 'GET', data: { userId } }),
  getRelationNotifications: (userId, params = {}) =>
    request({ url: '/api/relation/notifications', method: 'GET', data: { userId, ...params } }),
  readRelationNotification: (data) =>
    request({ url: '/api/relation/notification/read', method: 'POST', data }),
  readAllRelationNotifications: (data) =>
    request({ url: '/api/relation/notification/read-all', method: 'POST', data }),
  getRelationMemories: (userId, params = {}) =>
    request({ url: '/api/relation/memories', method: 'GET', data: { userId, ...params } }),
  inviteRelation: (data) =>
    request({ url: '/api/relation/invite', method: 'POST', data }),
  respondRelation: (data) =>
    request({ url: '/api/relation/respond', method: 'POST', data }),
  closeRelation: (data) =>
    request({ url: '/api/relation/close', method: 'POST', data }),
  createRelationAction: (data) =>
    request({ url: '/api/relation/action', method: 'POST', data }),
  respondRelationAction: (data) =>
    request({ url: '/api/relation/action/respond', method: 'POST', data }),
  completeRelationAction: (data) =>
    request({ url: '/api/relation/action/complete', method: 'POST', data }),
  sendLoveNote: (data) =>
    request({ url: '/api/relation/note', method: 'POST', data }),
  voteAction: (data) =>
    request({ url: '/api/relation/action/vote', method: 'POST', data }),

  // 圈子系统相关
// ... (rest of the file)
  getCircleInteractions: (circleId) =>
    request({ url: '/api/circle/interactions', method: 'GET', data: { circleId } }),

  // AI 相关
  generateFoodImage: (foodName) =>
    request({ url: '/api/ai/generate-image', method: 'POST', data: { foodName } }),
  generateFoodRecipe: (foodName) =>
    request({ url: '/api/ai/generate-recipe', method: 'POST', data: { foodName } }),
  getMoodRecommendation: (data) =>
    request({ url: '/api/ai/mood-recommendation', method: 'POST', data }),
  getChallengeQuestions: (data) =>
    request({ url: '/api/ai/challenge-questions', method: 'POST', data })
};
