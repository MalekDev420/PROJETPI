const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
require('dotenv').config();

async function seedNotifications() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akkeri:akkeri@cluster0.d4bklnm.mongodb.net/event_management');
    console.log('✅ MongoDB connected successfully');

    // Find users
    const teacher = await User.findOne({ email: 'teacher@test.com' });
    const student = await User.findOne({ email: 'student@test.com' });
    
    if (!teacher) {
      console.error('❌ Teacher user not found');
      process.exit(1);
    }

    // Find events
    const events = await Event.find().limit(5);
    
    if (events.length === 0) {
      console.error('❌ No events found. Please run seedEvents.js first');
      process.exit(1);
    }

    // Check if notifications already exist
    const notificationCount = await Notification.countDocuments();
    console.log(`📊 Found ${notificationCount} notifications in database`);

    if (notificationCount === 0) {
      console.log('📝 Creating notifications...');
      
      // Create notifications for the teacher
      const notifications = [
        {
          recipient: teacher._id,
          type: 'event_approved',
          title: 'Event Approved',
          message: `Your event "${events[0].title}" has been approved by the admin`,
          relatedEvent: events[0]._id,
          isRead: false,
          priority: 'high'
        },
        {
          recipient: teacher._id,
          type: 'registration_confirmed',
          title: 'New Registration',
          message: `A student has registered for "${events[0].title}"`,
          relatedEvent: events[0]._id,
          isRead: false,
          priority: 'medium'
        },
        {
          recipient: teacher._id,
          type: 'event_rejected',
          title: 'Event Rejected',
          message: `Your event "${events[4] ? events[4].title : 'Mobile App Development'}" was rejected: Lab unavailable`,
          relatedEvent: events[4] ? events[4]._id : null,
          isRead: true,
          priority: 'high'
        },
        {
          recipient: teacher._id,
          type: 'event_reminder',
          title: 'Event Starting Soon',
          message: `Your event "${events[1].title}" starts in 3 days`,
          relatedEvent: events[1]._id,
          isRead: false,
          priority: 'urgent'
        },
        {
          recipient: teacher._id,
          type: 'system_announcement',
          title: 'Welcome to Event Management System',
          message: 'Your account has been activated. You can now create and manage events.',
          isRead: true,
          priority: 'low'
        },
        {
          recipient: teacher._id,
          type: 'feedback_request',
          title: 'Feedback Requested',
          message: `Please provide feedback for the completed event "${events[2].title}"`,
          relatedEvent: events[2]._id,
          isRead: false,
          priority: 'medium'
        }
      ];

      const createdNotifications = await Notification.insertMany(notifications);
      console.log(`✅ Created ${createdNotifications.length} notifications for teacher`);

      // If student exists, create notifications for them too
      if (student) {
        const studentNotifications = [
          {
            recipient: student._id,
            type: 'registration_confirmed',
            title: 'Registration Confirmed',
            message: `You have successfully registered for "${events[0].title}"`,
            relatedEvent: events[0]._id,
            isRead: false,
            priority: 'high'
          },
          {
            recipient: student._id,
            type: 'event_reminder',
            title: 'Event Reminder',
            message: `The event "${events[0].title}" starts in 7 days`,
            relatedEvent: events[0]._id,
            isRead: false,
            priority: 'medium'
          },
          {
            recipient: student._id,
            type: 'new_event',
            title: 'New Event Available',
            message: `Check out the new event: "${events[1].title}"`,
            relatedEvent: events[1]._id,
            isRead: false,
            priority: 'low'
          }
        ];
        
        const createdStudentNotifications = await Notification.insertMany(studentNotifications);
        console.log(`✅ Created ${createdStudentNotifications.length} notifications for student`);
      }

      console.log('\n🎉 Notifications created successfully!');
      
    } else {
      console.log('✅ Notifications already exist in database');
      
      // List existing notifications
      const notifications = await Notification.find({}, 'title type recipient').populate('recipient', 'email').limit(10);
      console.log('\nExisting notifications:');
      notifications.forEach(notif => {
        console.log(`  - ${notif.title} (${notif.type}) - ${notif.recipient?.email || 'No recipient'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error seeding notifications:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedNotifications();