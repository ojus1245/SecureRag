const mongoose = require('mongoose');
const config = require('../config/config');
const Role = require('../models/Role');
const User = require('../models/User');

async function run() {
  try {
    console.log('Connecting to MongoDB at:', config.mongodb.uri);
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB successfully.');

    const defaultRoles = Role.getDefaultRoles();

    for (const roleData of defaultRoles) {
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

    // Ensure admin user has admin role
    const adminRole = await Role.findOne({ name: 'admin' });
    if (adminRole) {
      await User.updateMany(
        { $or: [{ username: 'admin' }, { email: 'admin@securerag.com' }] },
        { $set: { role: adminRole._id, securityClearance: 'restricted', isActive: true } }
      );
      console.log('✅ Admin user role verified and linked');
    }

    console.log('\nDatabase update completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
