// API配置文件
const env = 'development'; // 切换环境：'development' 或 'production'

const API_BASE_URL = {
  development: 'http://192.168.31.246:3000',
  production: 'https://what-we-do.onrender.com' // 替换为你的线上部署API
};

export const baseUrl = API_BASE_URL[env];
