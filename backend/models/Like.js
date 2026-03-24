const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合唯一索引，确保一个用户对一个帖子只能点赞一次
LikeSchema.index({ user: 1, post: 1 }, { unique: true });

const Like = mongoose.model('Like', LikeSchema);

module.exports = Like;
