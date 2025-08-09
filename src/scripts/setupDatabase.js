const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akkeri:akkeri@cluster0.d4bklnm.mongodb.net/event_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');

    // Check if users exist
    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users in database`);

    if (userCount === 0) {
      console.log('📝 Creating initial users...');
      
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await User.create({
        email: 'admin@test.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'Administration',
        isActive: true,
        isEmailVerified: true
      });
      console.log('✅ Admin user created: admin@test.com / admin123');

      // Create teacher user
      const teacherPassword = await bcrypt.hash('teacher123', 10);
      const teacher = await User.create({
        email: 'teacher@test.com',
        password: teacherPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: 'teacher',
        department: 'Computer Science',
        isActive: true,
        isEmailVerified: true
      });
      console.log('✅ Teacher user created: teacher@test.com / teacher123');

      // Create student user
      const studentPassword = await bcrypt.hash('student123', 10);
      const student = await User.create({
        email: 'student@test.com',
        password: studentPassword,
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'student',
        department: 'Computer Science',
        studentId: 'STU001',
        isActive: true,
        isEmailVerified: true
      });
      console.log('✅ Student user created: student@test.com / student123');

      console.log('\n🎉 Database setup complete!');
      console.log('You can now login with:');
      console.log('  Admin: admin@test.com / admin123');
      console.log('  Teacher: teacher@test.com / teacher123');
      console.log('  Student: student@test.com / student123');
    } else {
      console.log('✅ Users already exist in database');
      
      // List existing users
      const users = await User.find({}, 'email role department').limit(10);
      console.log('\nExisting users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - ${user.department}`);
      });
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.message.includes('authentication failed')) {
      console.log('\n🔧 Please check your MongoDB credentials in .env file');
      console.log('Current URI:', process.env.MONGODB_URI);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

setupDatabase();