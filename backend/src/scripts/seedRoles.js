const mongoose = require('mongoose');
const config = require('../config/config');
const Role = require('../models/Role');
const User = require('../models/User');

const roleUpdates = [
  { 
    name: 'admin', 
    description: 'Full system access with all permissions',
    permissions: ['all:access'],
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

async function run() {
  try {
    console.log('Connecting to MongoDB at:', config.mongodb.uri);
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB successfully.');

    for (const roleData of roleUpdates) {
      const result = await Role.updateOne(
        { name: roleData.name },
        { $set: roleData },
        { upsert: true }
      );
      console.log(`Role ${roleData.name}:`, result.modifiedCount > 0 ? 'MODIFIED' : (result.upsertedCount > 0 ? 'CREATED' : 'ALREADY UP TO DATE'));
    }

    console.log('\n=== CURRENT ROLES IN DB ===');
    const roles = await Role.find().select('name permissions accessLevel isActive');
    for (const r of roles) {
      console.log(`${r.name} (level ${r.accessLevel}, active: ${r.isActive}): [${r.permissions.join(', ')}]`);
    }

    // Upgrade Shatavali_Bahadure to analyst
    const analystRole = await Role.findOne({ name: 'analyst' });
    if (analystRole) {
      await User.updateOne(
        { username: 'Shatavali_Bahadure' },
        { $set: { role: analystRole._id, tokenVersion: 0 } }
      );
      console.log('✅ Shatavali_Bahadure upgraded to analyst role');
    }

    // Also verify users in the database
    console.log('\n=== USERS IN DB ===');
    const users = await User.find().populate('role', 'name permissions');
    for (const u of users) {
      console.log(`User: ${u.username} (${u.email}), Role: ${u.role?.name || 'NO_ROLE'}, Permissions: [${(u.role?.permissions || []).join(', ')}]`);
    }

    await mongoose.disconnect();
    console.log('\nDatabase update completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating roles:', err);
    process.exit(1);
  }
}

run();
