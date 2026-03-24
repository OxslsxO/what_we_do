const COS = require('cos-nodejs-sdk-v5');
const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

const secretId = process.env.TENCENT_CLOUD_SECRET_ID;
const secretKey = process.env.TENCENT_CLOUD_SECRET_KEY;
const bucket = process.env.TENCENT_CLOUD_BUCKET || 'what-we-do-1321630453';
const region = process.env.TENCENT_CLOUD_REGION || 'ap-guangzhou';
const customDomain = process.env.TENCENT_CLOUD_DOMAIN || '';

const hasCosConfig = !!(secretId && secretKey);

const cos = hasCosConfig
  ? new COS({
      SecretId: secretId,
      SecretKey: secretKey
    })
  : null;

function sanitizeName(name = '') {
  return String(name).trim() || 'today';
}

function getObjectKey(foodName) {
  return `food-images/${encodeURIComponent(sanitizeName(foodName))}.jpg`;
}

function getCosBaseUrl() {
  if (customDomain) {
    const normalizedDomain = customDomain.replace(/\/$/, '');
    if (/^https?:\/\//.test(normalizedDomain)) {
      return normalizedDomain;
    }
    return `https://${normalizedDomain}`;
  }

  return `https://${bucket}.cos.${region}.myqcloud.com`;
}

function createFallbackImage(foodName) {
  const safeName = sanitizeName(foodName);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF6EA" />
          <stop offset="52%" stop-color="#F6E6C9" />
          <stop offset="100%" stop-color="#E8D7BA" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.9)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="720" height="960" rx="52" fill="url(#bg)" />
      <circle cx="180" cy="170" r="210" fill="url(#glow)" />
      <circle cx="550" cy="790" r="180" fill="rgba(255,255,255,0.18)" />
      <rect x="76" y="88" width="568" height="784" rx="42" fill="rgba(255,255,255,0.62)" stroke="rgba(202,155,97,0.28)" />
      <text x="360" y="338" text-anchor="middle" font-size="160">🍽️</text>
      <text x="360" y="460" text-anchor="middle" font-size="38" fill="#8C643A" font-family="PingFang SC, Microsoft YaHei, sans-serif">今天吃点啥</text>
      <text x="360" y="534" text-anchor="middle" font-size="56" fill="#5B3C1D" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">${safeName}</text>
      <text x="360" y="616" text-anchor="middle" font-size="28" fill="#7D644A" font-family="PingFang SC, Microsoft YaHei, sans-serif">图片生成暂未完成，先用温柔占位图兜底</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function checkImageExists(foodName) {
  if (!hasCosConfig || !cos) {
    logger.warn('COS 未配置，使用本地兜底图');
    return false;
  }

  return new Promise((resolve) => {
    cos.headObject(
      {
        Bucket: bucket,
        Region: region,
        Key: getObjectKey(foodName)
      },
      (err) => {
        if (err) {
          if (err.statusCode !== 404) {
            logger.error('检查 COS 图片失败', err);
          }
          resolve(false);
          return;
        }

        resolve(true);
      }
    );
  });
}

function getImageUrl(foodName) {
  if (!hasCosConfig || !cos) {
    return createFallbackImage(foodName);
  }

  return `${getCosBaseUrl()}/${getObjectKey(foodName)}`;
}

async function uploadImage(foodName, imageBuffer) {
  if (!hasCosConfig || !cos) {
    logger.warn('COS 未配置，上传跳过并返回本地兜底图');
    return createFallbackImage(foodName);
  }

  return new Promise((resolve) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: getObjectKey(foodName),
        Body: imageBuffer,
        ContentType: 'image/jpeg'
      },
      (err, data) => {
        if (err) {
          logger.error('上传 COS 图片失败', err);
          resolve(createFallbackImage(foodName));
          return;
        }

        logger.info('上传 COS 图片成功', {
          key: getObjectKey(foodName),
          etag: data && data.ETag
        });
        resolve(getImageUrl(foodName));
      }
    );
  });
}

module.exports = {
  checkImageExists,
  getImageUrl,
  uploadImage
};
