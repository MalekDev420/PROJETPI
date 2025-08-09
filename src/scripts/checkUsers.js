const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akkeri:akkeri@cluster0.d4bklnm.mongodb.net/event_management');
    console.log('✅ MongoDB connected successfully');

    const users = await User.find({}, 'email role firstName lastName createdAt');
    
    console.log(`\n📊 Found ${users.length} users in database:\n`);
    
    users.forEach(user => {
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log(`  ID: ${user._id}`);
      console.log('  ---');
    });

    // Check specifically for teacher@test.com
    const teacher = await User.findOne({ email: 'teacher@test.com' });
    if (teacher) {
      console.log('\n✅ Teacher account found!');
      console.log('  Password field exists:', !!teacher.password);
    } else {
      console.log('\n❌ Teacher account NOT found!');
      console.log('Run: node src/scripts/setupDatabase.js to create users');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkUsers();