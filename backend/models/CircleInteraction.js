const mongoose = require('mongoose');

const CircleInteractionSchema = new mongoose.Schema({
  circleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Circle',
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  actionType: {
    type: String,
    enum: ['ping', 'line_connect', 'poke', 'share', 'gacha_spin'],
    required: true
  },
  metaData: {
    type: Object,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000) // 连线默认半小时消散
  }
}, { timestamps: true });

// 建立TTL索引自动清理过期的互动特效流线
CircleInteractionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CircleInteraction', CircleInteractionSchema);
