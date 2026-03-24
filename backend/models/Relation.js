const mongoose = require('mongoose');

const RelationMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: {
      type: String,
      default: ''
    },
    roleLabel: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const RelationAddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: ''
    },
    receiver: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const RelationStatsSchema = new mongoose.Schema(
  {
    actionsCount: {
      type: Number,
      default: 0
    },
    completedCount: {
      type: Number,
      default: 0
    },
    memoryCount: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActionAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const RelationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['lover', 'buddy', 'bestie'],
      default: 'lover'
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'closed'],
      default: 'pending'
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: {
      type: [RelationMemberSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'Relation must contain exactly two members.'
      }
    },
    anniversary: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    commonAvoids: {
      type: [String],
      default: []
    },
    commonAddresses: {
      type: [RelationAddressSchema],
      default: []
    },
    stats: {
      type: RelationStatsSchema,
      default: () => ({})
    },
    lastInteractionAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

RelationSchema.index({ 'members.user': 1, status: 1 });
RelationSchema.index({ invitedBy: 1, status: 1 });

module.exports = mongoose.model('Relation', RelationSchema);
