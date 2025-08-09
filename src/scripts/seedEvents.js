const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
require('dotenv').config();

async function seedEvents() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akkeri:akkeri@cluster0.d4bklnm.mongodb.net/event_management');
    console.log('✅ MongoDB connected successfully');

    // Find the teacher user
    const teacher = await User.findOne({ email: 'teacher@test.com' });
    const admin = await User.findOne({ email: 'admin@test.com' });
    const student = await User.findOne({ email: 'student@test.com' });
    
    if (!teacher) {
      console.error('❌ Teacher user not found. Please run setupDatabase.js first');
      process.exit(1);
    }

    // Check if events already exist
    const eventCount = await Event.countDocuments();
    console.log(`📊 Found ${eventCount} events in database`);

    if (eventCount === 0) {
      console.log('📝 Creating initial events...');
      
      // Create events with different statuses
      const events = [
        {
          title: 'Advanced Web Development Workshop',
          description: 'Learn modern web development techniques including React, Node.js, and cloud deployment. This comprehensive workshop covers frontend frameworks, backend APIs, database design, and deployment strategies.',
          category: 'Workshop',
          organizer: teacher._id,
          approvedBy: admin._id,
          status: 'approved',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
          registrationDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Lab 301',
            building: 'Tech Building',
            address: '123 University Ave',
            capacity: 30
          },
          maxParticipants: 30,
          minParticipants: 10,
          tags: ['web', 'programming', 'javascript', 'react', 'nodejs'],
          targetAudience: 'students',
          prerequisites: ['Basic HTML/CSS', 'JavaScript fundamentals'],
          visibility: 'public',
          registrations: student ? [{
            user: student._id,
            registeredAt: new Date(),
            attended: false
          }] : []
        },
        {
          title: 'AI & Machine Learning Seminar',
          description: 'Introduction to AI concepts and hands-on machine learning projects. Explore neural networks, deep learning, and practical applications in various industries.',
          category: 'Seminar',
          organizer: teacher._id,
          approvedBy: admin._id,
          status: 'approved',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Auditorium A',
            building: 'Main Building',
            address: '123 University Ave',
            capacity: 100
          },
          maxParticipants: 100,
          minParticipants: 20,
          tags: ['AI', 'ML', 'technology', 'data science'],
          targetAudience: 'all',
          visibility: 'public',
          registrations: []
        },
        {
          title: 'Database Design Masterclass',
          description: 'Deep dive into database design patterns, optimization, and best practices. Learn about normalization, indexing, query optimization, and NoSQL databases.',
          category: 'Academic',
          organizer: teacher._id,
          status: 'pending',
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Room 205',
            building: 'CS Building',
            address: '123 University Ave',
            capacity: 40
          },
          maxParticipants: 40,
          minParticipants: 15,
          tags: ['database', 'SQL', 'design', 'optimization'],
          targetAudience: 'students',
          prerequisites: ['Basic SQL knowledge', 'Data structures'],
          visibility: 'public'
        },
        {
          title: 'Career Fair 2024',
          description: 'Annual career fair featuring top tech companies. Network with recruiters, learn about job opportunities, and attend resume workshops.',
          category: 'Career',
          organizer: teacher._id,
          approvedBy: admin._id,
          status: 'approved',
          startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Main Hall',
            building: 'Convention Center',
            address: '456 Career Blvd',
            capacity: 500
          },
          maxParticipants: 500,
          minParticipants: 50,
          tags: ['career', 'networking', 'jobs', 'internships'],
          targetAudience: 'all',
          visibility: 'public'
        },
        {
          title: 'Mobile App Development with Flutter',
          description: 'Build cross-platform mobile applications using Flutter and Dart. Create beautiful, natively compiled applications for mobile, web, and desktop from a single codebase.',
          category: 'Workshop',
          organizer: teacher._id,
          status: 'rejected',
          rejectionReason: 'Lab unavailable on requested date',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Mobile Lab',
            building: 'Tech Building',
            address: '123 University Ave',
            capacity: 25
          },
          maxParticipants: 25,
          minParticipants: 10,
          tags: ['mobile', 'flutter', 'dart', 'cross-platform'],
          targetAudience: 'students',
          prerequisites: ['Basic programming knowledge'],
          visibility: 'public'
        },
        {
          title: 'Python for Data Science',
          description: 'Learn Python programming with a focus on data science applications. Cover pandas, numpy, matplotlib, and scikit-learn.',
          category: 'Academic',
          organizer: teacher._id,
          approvedBy: admin._id,
          status: 'approved',
          startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Lab 202',
            building: 'Data Science Center',
            address: '789 Analytics Way',
            capacity: 35,
            virtualLink: 'https://meet.google.com/abc-defg-hij'
          },
          maxParticipants: 35,
          minParticipants: 10,
          tags: ['python', 'data science', 'analytics', 'programming'],
          targetAudience: 'students',
          visibility: 'public',
          isVirtual: false,
          isHybrid: true
        },
        {
          title: 'Cybersecurity Fundamentals',
          description: 'Introduction to cybersecurity concepts, threats, and protection strategies. Learn about network security, cryptography, and ethical hacking basics.',
          category: 'Seminar',
          organizer: teacher._id,
          status: 'pending',
          startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Virtual Only',
            building: 'Online',
            virtualLink: 'https://zoom.us/j/123456789',
            capacity: 200
          },
          maxParticipants: 200,
          minParticipants: 30,
          tags: ['security', 'cybersecurity', 'networking', 'ethical hacking'],
          targetAudience: 'students',
          visibility: 'public',
          isVirtual: true,
          isHybrid: false
        },
        {
          title: 'Cloud Computing with AWS',
          description: 'Get hands-on experience with Amazon Web Services. Learn about EC2, S3, Lambda, and other core AWS services.',
          category: 'Technical',
          organizer: teacher._id,
          approvedBy: admin._id,
          status: 'approved',
          startDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
          location: {
            room: 'Cloud Lab',
            building: 'Tech Building',
            address: '123 University Ave',
            capacity: 25
          },
          maxParticipants: 25,
          minParticipants: 8,
          tags: ['cloud', 'AWS', 'devops', 'infrastructure'],
          targetAudience: 'students',
          prerequisites: ['Basic Linux commands', 'Web development basics'],
          visibility: 'public'
        }
      ];

      // Create all events
      const createdEvents = await Event.insertMany(events);
      console.log(`✅ Created ${createdEvents.length} events`);

      // Create notifications for the teacher
      const notifications = [
        {
          recipient: teacher._id,
          type: 'event_approved',
          title: 'Event Approved',
          message: 'Your event "Advanced Web Development Workshop" has been approved by the admin',
          relatedEvent: createdEvents[0]._id,
          isRead: false
        },
        {
          recipient: teacher._id,
          type: 'event_registration',
          title: 'New Registration',
          message: 'A student has registered for "Advanced Web Development Workshop"',
          relatedEvent: createdEvents[0]._id,
          isRead: false
        },
        {
          recipient: teacher._id,
          type: 'event_rejected',
          title: 'Event Rejected',
          message: 'Your event "Mobile App Development with Flutter" was rejected: Lab unavailable on requested date',
          relatedEvent: createdEvents[4]._id,
          isRead: true
        },
        {
          recipient: teacher._id,
          type: 'event_reminder',
          title: 'Event Starting Soon',
          message: 'Your event "Python for Data Science" starts in 3 days',
          relatedEvent: createdEvents[5]._id,
          isRead: false
        },
        {
          recipient: teacher._id,
          type: 'system',
          title: 'Welcome to Event Management System',
          message: 'Your account has been activated. You can now create and manage events.',
          isRead: true
        }
      ];

      await Notification.insertMany(notifications);
      console.log(`✅ Created ${notifications.length} notifications`);

      // If student exists, create notifications for them too
      if (student) {
        const studentNotifications = [
          {
            recipient: student._id,
            type: 'event_registration',
            title: 'Registration Confirmed',
            message: 'You have successfully registered for "Advanced Web Development Workshop"',
            relatedEvent: createdEvents[0]._id,
            isRead: false
          },
          {
            recipient: student._id,
            type: 'event_reminder',
            title: 'Event Reminder',
            message: 'The event "Advanced Web Development Workshop" starts in 7 days',
            relatedEvent: createdEvents[0]._id,
            isRead: false
          }
        ];
        await Notification.insertMany(studentNotifications);
        console.log(`✅ Created ${studentNotifications.length} notifications for student`);
      }

      console.log('\n🎉 Database seeding complete!');
      console.log('Events have been created with various statuses:');
      console.log('  - Approved: 5 events');
      console.log('  - Pending: 2 events');
      console.log('  - Rejected: 1 event');
      console.log('\nNotifications have been created for users');
      
    } else {
      console.log('✅ Events already exist in database');
      
      // List existing events
      const events = await Event.find({}, 'title status organizer').populate('organizer', 'email').limit(10);
      console.log('\nExisting events:');
      events.forEach(event => {
        console.log(`  - ${event.title} (${event.status}) - ${event.organizer?.email || 'No organizer'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedEvents();