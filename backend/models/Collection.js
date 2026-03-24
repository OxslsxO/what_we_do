const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
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

// 复合唯一索引，确保一个用户对一个帖子只能收藏一次
CollectionSchema.index({ user: 1, post: 1 }, { unique: true });

const Collection = mongoose.model('Collection', CollectionSchema);

module.exports = Collection;
