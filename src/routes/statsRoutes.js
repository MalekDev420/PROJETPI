const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const statsController = require('../controllers/statsController');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Get comprehensive reports data (admin only)
router.get('/reports', authenticate, isAdmin, statsController.getReports);

// Get dashboard statistics based on role
router.get('/dashboard', authenticate, async (req, res) => {
  // Mock data if DB not connected
  if (mongoose.connection.readyState !== 1) {
    const mockStats = {
      admin: {
        totalUsers: 45,
        activeUsers: 42,
        totalEvents: 28,
        pendingEvents: 3,
        approvedEvents: 20,
        upcomingEvents: 8,
        totalRegistrations: 156,
        unreadNotifications: 2
      },
      teacher: {
        myEvents: 8,
        pendingEvents: 2,
        approvedEvents: 5,
        totalAttendees: 120,
        unreadNotifications: 1
      },
      student: {
        registeredEvents: 5,
        attendedEvents: 3,
        upcomingEvents: 2,
        unreadNotifications: 3
      }
    };

    const role = req.user?.role || 'student';
    return res.json({ 
      success: true, 
      data: mockStats[role] || mockStats.student 
    });
  }

  // Original implementation
  try {
    let stats = {};
    
    if (req.user.role === 'admin') {
      // Admin statistics
      stats = {
        totalUsers: await User.countDocuments(),
        activeUsers: await User.countDocuments({ isActive: true }),
        totalEvents: await Event.countDocuments(),
        pendingEvents: await Event.countDocuments({ status: 'pending' }),
        approvedEvents: await Event.countDocuments({ status: 'approved' }),
        upcomingEvents: await Event.countDocuments({ 
          status: 'approved',
          startDate: { $gte: new Date() }
        }),
        totalRegistrations: await Event.aggregate([
          { $unwind: '$registrations' },
          { $count: 'total' }
        ]).then(result => result[0]?.total || 0)
      };
    } else if (req.user.role === 'teacher') {
      // Teacher statistics
      stats = {
        myEvents: await Event.countDocuments({ organizer: req.user._id }),
        pendingEvents: await Event.countDocuments({ 
          organizer: req.user._id,
          status: 'pending'
        }),
        approvedEvents: await Event.countDocuments({ 
          organizer: req.user._id,
          status: 'approved'
        }),
        totalAttendees: await Event.aggregate([
          { $match: { organizer: req.user._id } },
          { $unwind: '$registrations' },
          { $count: 'total' }
        ]).then(result => result[0]?.total || 0)
      };
    } else {
      // Student statistics
      stats = {
        registeredEvents: await Event.countDocuments({ 
          'registrations.user': req.user._id 
        }),
        attendedEvents: await Event.countDocuments({ 
          'registrations.user': req.user._id,
          'registrations.attended': true
        }),
        upcomingEvents: await Event.countDocuments({ 
          'registrations.user': req.user._id,
          startDate: { $gte: new Date() }
        })
      };
    }
    
    // Common stats for all users
    stats.unreadNotifications = await Notification.countDocuments({ 
      recipient: req.user._id,
      isRead: false
    });
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get event statistics (admin only)
router.get('/events', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = {
      byCategory: await Event.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      byStatus: await Event.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      monthlyEvents: await Event.aggregate([
        {
          $group: {
            _id: { 
              year: { $year: '$startDate' },
              month: { $month: '$startDate' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      topOrganizers: await Event.aggregate([
        { $group: { _id: '$organizer', eventCount: { $sum: 1 } } },
        { $sort: { eventCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
            eventCount: 1
          }
        }
      ])
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get student statistics
router.get('/student', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get registered events count
    const registeredEvents = await Event.countDocuments({
      'registrations.user': userId
    });

    // Get upcoming events count
    const upcomingEvents = await Event.countDocuments({
      'registrations.user': userId,
      startDate: { $gte: now }
    });

    // Get attended events count
    const attendedEvents = await Event.countDocuments({
      'registrations.user': userId,
      'registrations.attended': true,
      endDate: { $lt: now }
    });

    // Get certificates count (attended events in the past)
    const certificates = attendedEvents;

    // Get favorite categories
    const categoriesData = await Event.aggregate([
      { $match: { 'registrations.user': userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const favoriteCategories = categoriesData.map(cat => cat._id).filter(Boolean);

    // Calculate attendance rate
    const totalPastEvents = await Event.countDocuments({
      'registrations.user': userId,
      endDate: { $lt: now }
    });
    
    const attendanceRate = totalPastEvents > 0 
      ? Math.round((attendedEvents / totalPastEvents) * 100) 
      : 0;

    const stats = {
      registeredEvents,
      upcomingEvents,
      attendedEvents,
      certificates,
      favoriteCategories,
      attendanceRate
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get user statistics (admin only)
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = {
      byRole: await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      byDepartment: await User.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      registrationTrend: await User.aggregate([
        {
          $group: {
            _id: { 
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      activeVsInactive: await User.aggregate([
        { $group: { _id: '$isActive', count: { $sum: 1 } } }
      ])
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;