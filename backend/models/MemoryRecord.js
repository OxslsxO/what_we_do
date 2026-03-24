const mongoose = require('mongoose');

const MemoryParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const MemoryRecordSchema = new mongoose.Schema(
  {
    relation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Relation',
      required: true
    },
    action: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RelationAction',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    module: {
      type: String,
      enum: ['eat', 'play', 'photo', 'daily'],
      default: 'eat'
    },
    templateType: {
      type: String,
      enum: ['ate', 'went', 'shot', 'done', 'responded'],
      default: 'done'
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
      default: ''
    },
    mediaList: {
      type: [String],
      default: []
    },
    participants: {
      type: [MemoryParticipantSchema],
      default: []
    },
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

MemoryRecordSchema.index({ relation: 1, createdAt: -1 });
MemoryRecordSchema.index({ action: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('MemoryRecord', MemoryRecordSchema);
