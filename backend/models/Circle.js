const mongoose = require('mongoose');

const CircleMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const CircleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 30
  },
  type: {
    type: String,
    enum: ['roommates', 'gamers', 'besties', 'custom'],
    default: 'custom'
  },
  description: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: {
    type: [CircleMemberSchema],
    validate: {
      validator(value) {
        return Array.isArray(value) && value.length > 0 && value.length <= 4;
      },
      message: 'Circle members must be between 1 and 4.'
    }
  },
  status: {
    type: String,
    enum: ['active', 'disbanded'],
    default: 'active'
  },
  gachaPool: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Circle', CircleSchema);
