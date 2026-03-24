const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  count: {
    type: Number,
    default: 0
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

// 更新时间中间件
TagSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

const Tag = mongoose.model('Tag', TagSchema);

module.exports = Tag;
