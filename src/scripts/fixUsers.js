const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function fixUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akkeri:akkeri@cluster0.d4bklnm.mongodb.net/event_management');
    console.log('✅ MongoDB connected successfully');

    // Update each user with hashed password
    const updates = [
      { email: 'admin@test.com', password: 'admin123' },
      { email: 'teacher@test.com', password: 'teacher123' },
      { email: 'student@test.com', password: 'student123' }
    ];

    for (const update of updates) {
      const hashedPassword = await bcrypt.hash(update.password, 10);
      const result = await User.updateOne(
        { email: update.email },
        { $set: { password: hashedPassword } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated password for ${update.email}`);
      } else if (result.matchedCount > 0) {
        console.log(`⚠️  User ${update.email} already has a password`);
      } else {
        console.log(`❌ User ${update.email} not found`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying passwords...');
    const teacher = await User.findOne({ email: 'teacher@test.com' });
    if (teacher && teacher.password) {
      const isValid = await bcrypt.compare('teacher123', teacher.password);
      console.log(`Teacher password valid: ${isValid}`);
    }

    console.log('\n🎉 Users fixed! You can now login with:');
    console.log('  Admin: admin@test.com / admin123');
    console.log('  Teacher: teacher@test.com / teacher123');
    console.log('  Student: student@test.com / student123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixUsers();