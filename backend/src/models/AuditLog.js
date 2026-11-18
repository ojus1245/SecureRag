const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String,
      default: 'anonymous'
    },
    action: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      default: 'system'
    },
    resourceId: {
      type: String
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    requestId: {
      type: String
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'warning', 'error'],
      default: 'success'
    },
    sessionId: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.statics.createLog = async function(data) {
  try {
    const log = new this(data);
    return await log.save();
  } catch (error) {
    console.error('AuditLog.createLog error:', error);
    return null;
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

