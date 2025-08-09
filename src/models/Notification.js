const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: [
      'event_approved',
      'event_rejected',
      'event_cancelled',
      'event_updated',
      'event_reminder',
      'registration_confirmed',
      'registration_cancelled',
      'new_event',
      'system_announcement',
      'feedback_request',
      'waitlist_promotion'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  actionUrl: {
    type: String,
    default: null
  },
  actionText: {
    type: String,
    default: null
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ relatedEvent: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to create event notification
notificationSchema.statics.createEventNotification = async function(eventData, type, recipients) {
  const notifications = recipients.map(recipientId => ({
    recipient: recipientId,
    type: type,
    title: this.getNotificationTitle(type, eventData),
    message: this.getNotificationMessage(type, eventData),
    relatedEvent: eventData._id,
    priority: this.getNotificationPriority(type)
  }));
  
  return this.insertMany(notifications);
};

// Helper to get notification title based on type
notificationSchema.statics.getNotificationTitle = function(type, eventData) {
  const titles = {
    'event_approved': 'Event Approved',
    'event_rejected': 'Event Rejected',
    'event_cancelled': 'Event Cancelled',
    'event_updated': 'Event Updated',
    'event_reminder': 'Event Reminder',
    'registration_confirmed': 'Registration Confirmed',
    'registration_cancelled': 'Registration Cancelled',
    'new_event': 'New Event Available',
    'feedback_request': 'Feedback Requested',
    'waitlist_promotion': 'Spot Available'
  };
  return titles[type] || 'Notification';
};

// Helper to get notification message based on type
notificationSchema.statics.getNotificationMessage = function(type, eventData) {
  const messages = {
    'event_approved': `Your event "${eventData.title}" has been approved.`,
    'event_rejected': `Your event "${eventData.title}" has been rejected.`,
    'event_cancelled': `The event "${eventData.title}" has been cancelled.`,
    'event_updated': `The event "${eventData.title}" has been updated.`,
    'event_reminder': `Reminder: "${eventData.title}" starts soon.`,
    'registration_confirmed': `You're registered for "${eventData.title}".`,
    'registration_cancelled': `Your registration for "${eventData.title}" has been cancelled.`,
    'new_event': `New event available: "${eventData.title}".`,
    'feedback_request': `Please provide feedback for "${eventData.title}".`,
    'waitlist_promotion': `A spot is available for "${eventData.title}".`
  };
  return messages[type] || 'You have a new notification.';
};

// Helper to get notification priority based on type
notificationSchema.statics.getNotificationPriority = function(type) {
  const priorities = {
    'event_approved': 'high',
    'event_rejected': 'high',
    'event_cancelled': 'urgent',
    'event_reminder': 'high',
    'system_announcement': 'urgent'
  };
  return priorities[type] || 'medium';
};

module.exports = mongoose.model('Notification', notificationSchema);