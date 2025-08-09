const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'create',
      'update',
      'delete',
      'approve',
      'reject',
      'register',
      'unregister',
      'export',
      'import',
      'view'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: ['user', 'event', 'category', 'notification', 'report', 'system']
  },
  entityId: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to create an audit log entry
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent disrupting main flow
    return null;
  }
};

// Static method to log user actions
auditLogSchema.statics.logUserAction = async function(user, action, entity, entityId, details = {}, success = true) {
  return this.log({
    user: user._id || user,
    action,
    entity,
    entityId,
    details,
    success,
    severity: success ? 'info' : 'warning'
  });
};

// Static method to log system events
auditLogSchema.statics.logSystemEvent = async function(action, details = {}, severity = 'info') {
  return this.log({
    user: null,
    action,
    entity: 'system',
    details,
    severity
  });
};

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to get action description
auditLogSchema.methods.getActionDescription = function() {
  const actionDescriptions = {
    'login': 'Logged in',
    'logout': 'Logged out',
    'create': `Created ${this.entity}`,
    'update': `Updated ${this.entity}`,
    'delete': `Deleted ${this.entity}`,
    'approve': `Approved ${this.entity}`,
    'reject': `Rejected ${this.entity}`,
    'register': 'Registered for event',
    'unregister': 'Unregistered from event',
    'export': `Exported ${this.entity} data`,
    'import': `Imported ${this.entity} data`,
    'view': `Viewed ${this.entity}`
  };
  
  return actionDescriptions[this.action] || this.action;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;