const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  images: {
    type: Array,
    default: []
  },
  videos: {
    type: Array,
    default: []
  },
  tags: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Tag',
    default: []
  },
  playType: {
    type: String,
    default: ''
  },
  templateType: {
    type: String,
    default: ''
  },
  sourceModule: {
    type: String,
    default: ''
  },
  relationId: {
    type: String,
    default: ''
  },
  actionId: {
    type: String,
    default: ''
  },
  memoryId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'published'
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  collections: {
    type: Number,
    default: 0
  },
  shares: {
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
PostSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
