const mongoose = require('mongoose');

const allAdminPermissions = [
  '*',
  'all:access',
  'document:create',
  'document:read',
  'document:update',
  'document:delete',
  'document:share',
  'document:download',
  'document:export',
  'chat:query',
  'chat:history',
  'chat:feedback',
  'user:manage',
  'user:create',
  'user:read',
  'user:update',
  'user:delete',
  'role:manage',
  'audit:view',
  'audit:export',
  'audit:manage',
  'system:configure',
  'system:backup',
  'system:restore'
];

const defaultRolesList = [
  { 
    name: 'admin', 
    description: 'Full system access with all permissions',
    permissions: allAdminPermissions,
    accessLevel: 5,
    isSystemRole: true,
    isActive: true
  },
  { 
    name: 'manager', 
    description: 'Manage documents, users, and view audit logs',
    permissions: [
      'document:create',
      'document:read',
      'document:update',
      'document:share',
      'document:download',
      'document:export',
      'chat:query',
      'chat:history',
      'chat:feedback',
      'user:manage',
      'user:read',
      'audit:view',
      'audit:export'
    ],
    accessLevel: 4,
    isSystemRole: true,
    isActive: true
  },
  { 
    name: 'analyst', 
    description: 'Analyze documents and query the system',
    permissions: [
      'document:create',
      'document:read',
      'document:update',
      'document:download',
      'chat:query',
      'chat:history',
      'chat:feedback',
      'audit:view'
    ],
    accessLevel: 3,
    isSystemRole: true,
    isActive: true
  },
  { 
    name: 'viewer', 
    description: 'Read-only access to documents and basic queries',
    permissions: [
      'document:read',
      'chat:query',
      'chat:history'
    ],
    accessLevel: 2,
    isSystemRole: true,
    isActive: true
  },
  { 
    name: 'auditor', 
    description: 'Access to audit logs and reports',
    permissions: [
      'audit:view',
      'audit:export',
      'document:read'
    ],
    accessLevel: 2,
    isSystemRole: true,
    isActive: true
  }
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      type: [String],
      default: []
    },
    accessLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    isSystemRole: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
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

roleSchema.statics.getDefaultRoles = function() {
  return defaultRolesList;
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
