const express = require('express');
const router = express.Router();
const { authenticate, isTeacherOrAdmin, isAdmin } = require('../middleware/authMiddleware');
const aiService = require('../services/aiService');
const aiController = require('../controllers/aiController');
const Event = require('../models/Event');

// Chat endpoint - available to all authenticated users
router.post('/chat', authenticate, aiController.chat);

// Category-specific AI endpoints - admin only
router.get('/categories/suggestions', authenticate, isAdmin, aiController.suggestCategories);
router.get('/categories/analyze', authenticate, isAdmin, aiController.analyzeCategories);

// Suggest optimal time slot for an event
router.post('/suggest-timeslot', authenticate, isTeacherOrAdmin, async (req, res) => {
  try {
    const { eventData } = req.body;
    
    // Get existing events for conflict checking
    const existingEvents = await Event.find({
      status: 'approved',
      startDate: { $gte: new Date() }
    }).select('title startDate endDate location');
    
    const suggestion = await aiService.suggestTimeSlot(eventData, existingEvents);
    
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Predict attendance for an event
router.post('/predict-attendance', authenticate, isTeacherOrAdmin, async (req, res) => {
  try {
    const { eventData } = req.body;
    
    // Get historical data for similar events
    const historicalData = await Event.find({
      category: eventData.category,
      status: 'completed'
    }).select('title capacity registrations');
    
    const prediction = await aiService.predictAttendance(eventData, historicalData);
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get personalized event recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    // Get user profile with attended events
    const userProfile = {
      interests: req.user.preferences?.categories || [],
      department: req.user.department,
      attendedEvents: req.user.attendedEvents || []
    };
    
    // Get available upcoming events
    const availableEvents = await Event.find({
      status: 'approved',
      startDate: { $gte: new Date() },
      'registrations.user': { $ne: req.user._id }
    }).select('title category description');
    
    const recommendations = await aiService.recommendEvents(userProfile, availableEvents);
    
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check for scheduling conflicts
router.post('/conflict-check', authenticate, isTeacherOrAdmin, async (req, res) => {
  try {
    const { eventData } = req.body;
    
    // Get potentially conflicting events
    const existingEvents = await Event.find({
      status: { $in: ['approved', 'pending'] },
      $or: [
        {
          startDate: { $lte: eventData.endDate },
          endDate: { $gte: eventData.startDate }
        }
      ]
    }).select('title startDate endDate location targetAudience');
    
    const conflicts = await aiService.detectConflicts(eventData, existingEvents, []);
    
    res.json({ success: true, data: conflicts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-categorize event
router.post('/categorize', authenticate, isTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const categorization = await aiService.categorizeEvent(title, description);
    
    res.json({ success: true, data: categorization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analyze event feedback
router.get('/analyze-feedback/:eventId', authenticate, isTeacherOrAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('feedback organizer');
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    // Check permission
    const isAdmin = req.user.role === 'admin';
    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (!event.feedback || event.feedback.length === 0) {
      return res.json({ success: true, data: { message: 'No feedback available' } });
    }
    
    const analysis = await aiService.analyzeFeedback(event.feedback);
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;