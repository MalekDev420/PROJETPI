const Event = require('../models/Event');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all approved events with filters
exports.getAllEvents = async (req, res) => {
  try {
    const { 
      category, 
      startDate, 
      endDate, 
      search,
      page = 1,
      limit = 10,
      sortBy = 'startDate'
    } = req.query;

    // Build query - public endpoint only shows approved events
    const query = { status: 'approved' };

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Execute query with pagination
    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName email department')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching events',
      error: error.message 
    });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email department profilePicture')
      .populate('registrations.user', 'firstName lastName email')
      .populate('feedback.user', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching event',
      error: error.message 
    });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Create event with organizer as current user
    const eventData = {
      ...req.body,
      organizer: req.user._id,
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    };

    const event = new Event(eventData);
    await event.save();

    // If admin creates event, it's auto-approved
    if (req.user.role === 'admin') {
      event.approvedBy = req.user._id;
      event.approvedAt = new Date();
      await event.save();
    }

    // Send notification to admins if teacher created event
    if (req.user.role === 'teacher') {
      const admins = await User.find({ role: 'admin' });
      const adminIds = admins.map(admin => admin._id);
      
      await Notification.createEventNotification(
        event,
        'new_event',
        adminIds
      );
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating event',
      error: error.message 
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check permission
    const isAdmin = req.user.role === 'admin';
    const isOrganizer = event.organizer.toString() === req.user._id.toString();

    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this event' 
      });
    }

    // Only allow updates if event is pending or approved
    if (event.status === 'completed' || event.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot update ${event.status} event` 
      });
    }

    // Update event
    Object.keys(req.body).forEach(key => {
      if (key !== 'organizer' && key !== 'status') {
        event[key] = req.body[key];
      }
    });

    await event.save();

    // Notify registered users about update
    if (event.registrations.length > 0) {
      const userIds = event.registrations.map(reg => reg.user);
      await Notification.createEventNotification(
        event,
        'event_updated',
        userIds
      );
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating event',
      error: error.message 
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Only admin can delete events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators can delete events' 
      });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting event',
      error: error.message 
    });
  }
};

// Approve or reject event (Admin only)
exports.updateEventStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be approved or rejected' 
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    if (event.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending events can be approved or rejected' 
      });
    }

    // Update event status
    event.status = status;
    
    if (status === 'approved') {
      event.approvedBy = req.user._id;
      event.approvedAt = new Date();
    } else if (status === 'rejected') {
      event.rejectionReason = rejectionReason || 'No reason provided';
    }

    await event.save();

    // Notify organizer
    await Notification.create({
      recipient: event.organizer,
      type: status === 'approved' ? 'event_approved' : 'event_rejected',
      title: status === 'approved' ? 'Event Approved' : 'Event Rejected',
      message: status === 'approved' 
        ? `Your event "${event.title}" has been approved.`
        : `Your event "${event.title}" has been rejected. Reason: ${event.rejectionReason}`,
      relatedEvent: event._id,
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: `Event ${status} successfully`,
      data: event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating event status',
      error: error.message 
    });
  }
};

// Register for event
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot register for unapproved event' 
      });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Registration deadline has passed' 
      });
    }

    if (event.isUserRegistered(req.user._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already registered for this event' 
      });
    }

    if (event.isFull) {
      // Add to waitlist
      event.waitlist.push({ user: req.user._id });
      await event.save();

      return res.status(200).json({
        success: true,
        message: 'Event is full. You have been added to the waitlist',
        data: { waitlistPosition: event.waitlist.length }
      });
    }

    // Register user
    event.registrations.push({ user: req.user._id });
    await event.save();

    // Send confirmation notification
    await Notification.create({
      recipient: req.user._id,
      type: 'registration_confirmed',
      title: 'Registration Confirmed',
      message: `You have successfully registered for "${event.title}"`,
      relatedEvent: event._id,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      data: event
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering for event',
      error: error.message 
    });
  }
};

// Unregister from event
exports.unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    if (!event.isUserRegistered(req.user._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are not registered for this event' 
      });
    }

    // Remove user from registrations
    event.registrations = event.registrations.filter(
      reg => reg.user.toString() !== req.user._id.toString()
    );

    // If there's a waitlist, promote first person
    if (event.waitlist.length > 0) {
      const nextUser = event.waitlist.shift();
      event.registrations.push({ user: nextUser.user });
      
      // Notify promoted user
      await Notification.create({
        recipient: nextUser.user,
        type: 'waitlist_promotion',
        title: 'Spot Available',
        message: `A spot has become available for "${event.title}". You have been registered!`,
        relatedEvent: event._id,
        priority: 'high'
      });
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event'
    });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error unregistering from event',
      error: error.message 
    });
  }
};

// Get user's events
exports.getMyEvents = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    let query = {};

    switch (type) {
      case 'organized':
        query = { organizer: req.user._id };
        break;
      case 'registered':
        query = { 'registrations.user': req.user._id };
        break;
      case 'attended':
        query = { 
          'registrations.user': req.user._id,
          'registrations.attended': true 
        };
        break;
      default:
        query = {
          $or: [
            { organizer: req.user._id },
            { 'registrations.user': req.user._id }
          ]
        };
    }

    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName')
      .sort('-startDate');

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching your events',
      error: error.message 
    });
  }
};

// Get all events for admin (includes all statuses)
exports.getAllEventsAdmin = async (req, res) => {
  try {
    const { 
      category, 
      startDate, 
      endDate, 
      search,
      status,
      page = 1,
      limit = 100,
      sortBy = '-createdAt'
    } = req.query;

    // Build query - admin can see all events
    const query = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Execute query with pagination
    const events = await Event.find(query)
      .populate('organizer', 'firstName lastName email department')
      .populate('registrations.user', 'firstName lastName')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching events',
      error: error.message 
    });
  }
};

// Submit feedback for event
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check if user attended the event
    const registration = event.registrations.find(
      reg => reg.user.toString() === req.user._id.toString() && reg.attended
    );

    if (!registration) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must attend the event to provide feedback' 
      });
    }

    // Check if user already submitted feedback
    const existingFeedback = event.feedback.find(
      f => f.user.toString() === req.user._id.toString()
    );

    if (existingFeedback) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted feedback for this event' 
      });
    }

    // Add feedback
    event.feedback.push({
      user: req.user._id,
      rating,
      comment
    });

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting feedback',
      error: error.message 
    });
  }
};// // Get my upcoming events
exports.getMyUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      'registrations.user': req.user._id,
      startDate: { $gte: now },
      status: 'approved'
    })
    .populate('category')
    .sort({ startDate: 1 });

    res.json(events);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ 
      message: 'Error fetching upcoming events',
      error: error.message 
    });
  }
};

// Get my registered events
exports.getMyRegisteredEvents = async (req, res) => {
  try {
    const events = await Event.find({
      'registrations.user': req.user._id
    })
    .populate('category')
    .sort({ startDate: -1 });

    res.json(events);
  } catch (error) {
    console.error('Get registered events error:', error);
    res.status(500).json({ 
      message: 'Error fetching registered events',
      error: error.message 
    });
  }
};

// Get attended events
exports.getAttendedEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      'registrations.user': req.user._id,
      'registrations.attended': true,
      endDate: { $lt: now }
    })
    .populate('category')
    .sort({ startDate: -1 });

    // Add feedback status to each event
    const eventsWithFeedback = events.map(event => {
      const eventObj = event.toObject();
      eventObj.feedbackSubmitted = event.feedback.some(
        f => f.user.toString() === req.user._id.toString()
      );
      return eventObj;
    });

    res.json(eventsWithFeedback);
  } catch (error) {
    console.error('Get attended events error:', error);
    res.status(500).json({ 
      message: 'Error fetching attended events',
      error: error.message 
    });
  }
};
