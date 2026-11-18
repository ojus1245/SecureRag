const mongoose = require('mongoose');

const documentACLSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    permissions: {
      type: [String],
      default: ['read']
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    revokeReason: {
      type: String
    },
    revokedAt: {
      type: Date
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

documentACLSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date(this.expiresAt) <= new Date()) return false;
  return true;
};

const DocumentACL = mongoose.model('DocumentACL', documentACLSchema);

module.exports = DocumentACL;

