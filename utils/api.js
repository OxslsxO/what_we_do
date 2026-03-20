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
  createPost: (data) => request({ url: '/api/post/create', method: 'POST', data }),
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
  getUserInteractions: (userId) => request({ url: '/api/post/user/interactions', method: 'GET', data: { userId } })
};
