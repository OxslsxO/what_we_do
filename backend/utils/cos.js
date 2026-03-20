const COS = require('cos-nodejs-sdk-v5');
const dotenv = require('dotenv');
const logger = require('./logger');

// 加载配置文件
dotenv.config();

// 检查是否有腾讯云COS配置
const hasCosConfig = process.env.TENCENT_CLOUD_SECRET_ID && process.env.TENCENT_CLOUD_SECRET_KEY;

// 初始化腾讯云COS实例
let cos = null;
if (hasCosConfig) {
  cos = new COS({
    SecretId: process.env.TENCENT_CLOUD_SECRET_ID,
    SecretKey: process.env.TENCENT_CLOUD_SECRET_KEY
  });
}

// 存储桶配置
const bucket = process.env.TENCENT_CLOUD_BUCKET || 'what-we-do-1321630453';
const region = process.env.TENCENT_CLOUD_REGION || 'ap-guangzhou';

/**
 * 检查腾讯云COS中是否存在指定的图片
 * @param {string} foodName - 食物名称
 * @returns {Promise<boolean>} - 返回是否存在
 */
const checkImageExists = async (foodName) => {
  // 如果没有腾讯云COS配置，直接返回false
  if (!hasCosConfig) {
    logger.warn('腾讯云COS未配置，使用模拟数据');
    return false;
  }
  
  return new Promise((resolve, reject) => {
    const key = `food-images/${encodeURIComponent(foodName)}.jpg`;
    
    cos.headObject({
      Bucket: bucket,
      Region: region,
      Key: key
    }, (err, data) => {
      if (err) {
        if (err.statusCode === 404) {
          // 文件不存在
          resolve(false);
        } else {
          // 其他错误
          logger.error('检查图片存在失败:', err);
          resolve(false);
        }
      } else {
        // 文件存在
        resolve(true);
      }
    });
  });
};

/**
 * 从腾讯云COS获取图片URL
 * @param {string} foodName - 食物名称
 * @returns {string} - 返回图片URL
 */
const getImageUrl = (foodName) => {
  // 如果没有腾讯云COS配置，返回占位图
  if (!hasCosConfig) {
    return `https://via.placeholder.com/200x200?text=${encodeURIComponent(foodName)}`;
  }
  
  const key = `food-images/${encodeURIComponent(foodName)}.jpg`;
  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
};

/**
 * 上传图片到腾讯云COS
 * @param {string} foodName - 食物名称
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @returns {Promise<string>} - 返回上传后的图片URL
 */
const uploadImage = async (foodName, imageBuffer) => {
  // 如果没有腾讯云COS配置，返回占位图
  if (!hasCosConfig) {
    logger.warn('腾讯云COS未配置，使用占位图');
    return `https://via.placeholder.com/200x200?text=${encodeURIComponent(foodName)}`;
  }
  
  return new Promise((resolve, reject) => {
    const key = `food-images/${encodeURIComponent(foodName)}.jpg`;
    
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg'
    }, (err, data) => {
      if (err) {
        logger.error('上传图片失败:', err);
        // 上传失败时返回占位图
        resolve(`https://via.placeholder.com/200x200?text=${encodeURIComponent(foodName)}`);
      } else {
        logger.info('上传图片成功:', { key, etag: data.ETag });
        resolve(getImageUrl(foodName));
      }
    });
  });
};

module.exports = {
  checkImageExists,
  getImageUrl,
  uploadImage
};