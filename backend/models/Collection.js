const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
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

// 确保一个用户对一个帖子只能收藏一次
collectionSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);