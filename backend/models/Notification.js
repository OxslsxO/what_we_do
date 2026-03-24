const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    relation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Relation',
      default: null
    },
    action: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RelationAction',
      default: null
    },
    type: {
      type: String,
      enum: [
        'relation_invite',
        'relation_accept',
        'relation_decline',
        'action_created',
        'action_accepted',
        'action_declined',
        'action_completed',
        'relation_closed'
      ],
      default: 'action_created'
    },
    title: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      default: ''
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ relation: 1, createdAt: -1 });
NotificationSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
