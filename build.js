// 构建脚本
const fs = require('fs');
const path = require('path');

// 配置文件路径
const configPath = path.join(__dirname, 'config', 'api.js');

// 获取命令行参数
const args = process.argv.slice(2);
const env = args[0] || 'development';

// 读取配置文件
let configContent = fs.readFileSync(configPath, 'utf8');

// 替换环境变量
configContent = configContent.replace(/const env = '.*?';/, `const env = '${env}';`);

// 写入配置文件
fs.writeFileSync(configPath, configContent);

console.log(`环境已切换为: ${env}`);
console.log(`API地址: ${env === 'development' ? 'http://localhost:3000' : 'https://your-production-api.com'}`);
