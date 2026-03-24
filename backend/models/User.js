const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// 用户信息子模式
const UserInfoSchema = new mongoose.Schema({
  avatar: {
    type: String,
    default: 'https://img.icons8.com/ios-filled/100/000000/user.png'
  },
  name: {
    type: String,
    default: '新用户'
  },
  desc: {
    type: String,
    default: '享受生活，探索乐趣'
  },
  gender: {
    type: String,
    default: ''
  },
  birthday: {
    type: String,
    default: ''
  },
  region: {
    type: String,
    default: ''
  },
  hobbies: {
    type: Array,
    default: []
  },
  activities: {
    type: Number,
    default: 0
  },
  friends: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  wechatOpenid: {
    type: String,
    default: ''
  }
});

// 用户主模式
const UserSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: false,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  userInfo: {
    type: UserInfoSchema,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密中间件
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// 更新时间中间件
UserSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
