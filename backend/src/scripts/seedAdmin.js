const mongoose = require('mongoose');
const config = require('../config/config');
const Role = require('../models/Role');
const User = require('../models/User');

async function seedAdmin() {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB.');

    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('Admin role not found');
      process.exit(1);
    }

    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      admin = new User({
        username: 'admin',
        email: 'admin@securerag.com',
        password: 'Admin@123456',
        fullName: 'System Administrator',
        department: 'Security & Compliance',
        securityClearance: 'restricted',
        role: adminRole._id,
        isActive: true
      });
      await admin.save();
      console.log('✅ Default admin user created: admin / Admin@123456');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (err) {
    console.error('Seed admin error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();

