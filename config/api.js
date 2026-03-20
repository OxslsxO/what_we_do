// API配置文件
const env = 'development'; // 切换环境：'development' 或 'production'

const API_BASE_URL = {
  development: 'http://localhost:3000',
  production: 'https://what-we-do.onrender.com' // 替换为你的生产环境API地址
};

export const baseUrl = API_BASE_URL[env];
