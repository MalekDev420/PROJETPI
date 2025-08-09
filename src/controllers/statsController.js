const Event = require('../models/Event');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Get comprehensive reports data
exports.getReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Date query for filtering
    const dateQuery = {
      createdAt: { $gte: start, $lte: end }
    };
    
    // Get total events
    const totalEvents = await Event.countDocuments(dateQuery);
    const approvedEvents = await Event.countDocuments({ ...dateQuery, status: 'approved' });
    const upcomingEvents = await Event.countDocuments({
      status: 'approved',
      startDate: { $gt: new Date() }
    });
    const pastEvents = await Event.countDocuments({
      status: 'approved',
      endDate: { $lt: new Date() }
    });
    
    // Get events by category
    const eventsByCategory = await Event.aggregate([
      { $match: dateQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);
    
    // Get events by month
    const eventsByMonth = await Event.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $dateToString: {
              format: '%b',
              date: { $dateFromString: { dateString: { $concat: ['$_id', '-01'] } } }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Get total registrations
    const events = await Event.find(dateQuery);
    const totalRegistrations = events.reduce((sum, event) => sum + event.registrations.length, 0);
    const averageAttendance = totalEvents > 0 ? Math.round(totalRegistrations / totalEvents) : 0;
    
    // Calculate event completion rate
    const completedEvents = await Event.countDocuments({ ...dateQuery, status: 'completed' });
    const eventCompletionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments(dateQuery);
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: start, $lte: end }
    });
    
    // Calculate user growth rate
    const previousPeriodStart = new Date(start);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(start);
    const previousUsers = await User.countDocuments({
      createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd }
    });
    const userGrowthRate = previousUsers > 0 
      ? Math.round(((newUsers - previousUsers) / previousUsers) * 100 * 10) / 10
      : 0;
    
    // Get popular events
    const popularEvents = await Event.find({ ...dateQuery, status: 'approved' })
      .sort({ 'registrations.length': -1 })
      .limit(10)
      .populate('organizer', 'firstName lastName')
      .select('title category registrations startDate')
      .lean();
    
    const popularEventsData = popularEvents.map((event, index) => ({
      rank: index + 1,
      title: event.title,
      category: event.category,
      organizer: event.organizer ? `${event.organizer.firstName} ${event.organizer.lastName}` : 'Unknown',
      registrations: event.registrations.length,
      date: event.startDate
    }));
    
    // Get top organizers
    const topOrganizers = await Event.aggregate([
      { $match: dateQuery },
      { $group: {
        _id: '$organizer',
        eventsCreated: { $sum: 1 },
        totalRegistrations: { $sum: { $size: '$registrations' } },
        successfulEvents: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }},
      { $sort: { totalRegistrations: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate organizer details
    const organizerIds = topOrganizers.map(o => o._id);
    const organizerDetails = await User.find({ _id: { $in: organizerIds } })
      .select('firstName lastName');
    
    const organizerMap = {};
    organizerDetails.forEach(org => {
      organizerMap[org._id.toString()] = `${org.firstName} ${org.lastName}`;
    });
    
    const topOrganizersData = topOrganizers.map((org, index) => ({
      rank: index + 1,
      name: organizerMap[org._id.toString()] || 'Unknown',
      eventsCreated: org.eventsCreated,
      totalRegistrations: org.totalRegistrations,
      successRate: org.eventsCreated > 0 
        ? Math.round((org.successfulEvents / org.eventsCreated) * 100)
        : 0
    }));
    
    // Get department statistics
    const departmentStats = await User.aggregate([
      { $group: {
        _id: { department: '$department', role: '$role' },
        count: { $sum: 1 }
      }},
      { $group: {
        _id: '$_id.department',
        students: { 
          $sum: { $cond: [{ $eq: ['$_id.role', 'student'] }, '$count', 0] }
        },
        teachers: { 
          $sum: { $cond: [{ $eq: ['$_id.role', 'teacher'] }, '$count', 0] }
        }
      }},
      { $project: {
        department: '$_id',
        students: 1,
        teachers: 1,
        _id: 0
      }},
      { $sort: { students: -1 } },
      { $limit: 5 }
    ]);
    
    // Get registration trends (last 30 days)
    const registrationTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const eventsOnDate = await Event.find({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      const registrations = eventsOnDate.reduce((sum, event) => sum + event.registrations.length, 0);
      
      registrationTrends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        registrations
      });
    }
    
    // Find top category
    const topCategory = eventsByCategory.length > 0 ? eventsByCategory[0].category : 'None';
    
    res.status(200).json({
      success: true,
      data: {
        // Summary stats
        totalEvents,
        totalRegistrations,
        averageAttendance,
        eventCompletionRate,
        activeUsers,
        newUsers,
        userGrowthRate,
        topCategory,
        upcomingEvents,
        pastEvents,
        
        // Chart data
        eventsByCategory,
        eventsByMonth,
        registrationTrends,
        departmentStats,
        
        // Table data
        popularEvents: popularEventsData,
        topOrganizers: topOrganizersData
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating reports',
      error: error.message
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get counts
    const totalEvents = await Event.countDocuments();
    const totalUsers = await User.countDocuments();
    const pendingEvents = await Event.countDocuments({ status: 'pending' });
    const todayEvents = await Event.countDocuments({
      startDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    // Get recent activities
    const recentEvents = await Event.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('organizer', 'firstName lastName');
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName role createdAt');
    
    // Get monthly stats
    const monthlyEvents = await Event.countDocuments({
      createdAt: { $gte: thisMonth }
    });
    
    const monthlyRegistrations = await Event.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: { $size: '$registrations' } } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        totalUsers,
        pendingEvents,
        todayEvents,
        monthlyEvents,
        monthlyRegistrations: monthlyRegistrations[0]?.total || 0,
        recentEvents,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    if (period !== 'all') {
      const days = parseInt(period) || 30;
      startDate.setDate(startDate.getDate() - days);
    } else {
      startDate = new Date(0); // Beginning of time
    }
    
    // Get user distribution by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } }
    ]);
    
    // Get user registration trend
    const registrationTrend = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } }
    ]);
    
    // Get active users
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: startDate }
    });
    
    // Get top active users
    const topActiveUsers = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$registrations' },
      { $group: {
        _id: '$registrations.user',
        eventCount: { $sum: 1 }
      }},
      { $sort: { eventCount: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate user details
    const userIds = topActiveUsers.map(u => u._id);
    const userDetails = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email');
    
    const userMap = {};
    userDetails.forEach(user => {
      userMap[user._id.toString()] = user;
    });
    
    const topActiveUsersData = topActiveUsers.map(u => ({
      ...userMap[u._id.toString()],
      eventCount: u.eventCount
    }));
    
    res.status(200).json({
      success: true,
      data: {
        usersByRole,
        registrationTrend,
        activeUsers,
        topActiveUsers: topActiveUsersData,
        totalUsers: await User.countDocuments()
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user analytics',
      error: error.message
    });
  }
};

// Get event analytics
exports.getEventAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    if (period !== 'all') {
      const days = parseInt(period) || 30;
      startDate.setDate(startDate.getDate() - days);
    } else {
      startDate = new Date(0);
    }
    
    // Get events by status
    const eventsByStatus = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);
    
    // Get average attendance rate
    const eventsWithAttendance = await Event.find({
      status: 'completed',
      createdAt: { $gte: startDate }
    });
    
    let totalAttendanceRate = 0;
    let eventsWithData = 0;
    
    eventsWithAttendance.forEach(event => {
      if (event.maxParticipants > 0) {
        const rate = (event.registrations.length / event.maxParticipants) * 100;
        totalAttendanceRate += rate;
        eventsWithData++;
      }
    });
    
    const averageAttendanceRate = eventsWithData > 0 
      ? Math.round(totalAttendanceRate / eventsWithData)
      : 0;
    
    // Get events by day of week
    const eventsByDayOfWeek = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dayOfWeek: '$startDate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          day: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Sunday' },
                { case: { $eq: ['$_id', 2] }, then: 'Monday' },
                { case: { $eq: ['$_id', 3] }, then: 'Tuesday' },
                { case: { $eq: ['$_id', 4] }, then: 'Wednesday' },
                { case: { $eq: ['$_id', 5] }, then: 'Thursday' },
                { case: { $eq: ['$_id', 6] }, then: 'Friday' },
                { case: { $eq: ['$_id', 7] }, then: 'Saturday' }
              ]
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Get events by time of day
    const eventsByTimeOfDay = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: '$startDate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          hour: '$_id',
          timeRange: {
            $switch: {
              branches: [
                { case: { $lt: ['$_id', 6] }, then: 'Early Morning' },
                { case: { $lt: ['$_id', 12] }, then: 'Morning' },
                { case: { $lt: ['$_id', 17] }, then: 'Afternoon' },
                { case: { $lt: ['$_id', 21] }, then: 'Evening' },
                { case: { $gte: ['$_id', 21] }, then: 'Night' }
              ]
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        eventsByStatus,
        averageAttendanceRate,
        eventsByDayOfWeek,
        eventsByTimeOfDay,
        totalEvents: await Event.countDocuments({ createdAt: { $gte: startDate } })
      }
    });
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event analytics',
      error: error.message
    });
  }
};