const mongoose = require('mongoose');

const RelationActionSchema = new mongoose.Schema(
  {
    relation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Relation',
      required: true
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    module: {
      type: String,
      enum: ['eat', 'play', 'photo', 'daily'],
      default: 'eat'
    },
    type: {
      type: String,
      enum: [
        'eat_share', 
        'eat_treat', 
        'date_invite', 
        'photo_task', 
        'daily_task',
        'mood_blindbox',
        'love_note',
        'eat_challenge',
        'date_poll',
        'photo_mission_paired'
      ],
      default: 'eat_share'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'done', 'expired'],
      default: 'pending'
    },
    title: {
      type: String,
      default: ''
    },
    summary: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      default: ''
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    responseChoice: {
      type: String,
      default: ''
    },
    responseMessage: {
      type: String,
      default: ''
    },
    respondedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

RelationActionSchema.index({ relation: 1, status: 1, createdAt: -1 });
RelationActionSchema.index({ receiver: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('RelationAction', RelationActionSchema);
