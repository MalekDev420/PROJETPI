const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const { authenticate, authorize, isAdmin, isTeacherOrAdmin } = require('../middleware/authMiddleware');

// Validation rules
const createEventValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['Academic', 'Workshop', 'Seminar', 'Social', 'Career', 'Sports', 'Cultural', 'Technical']).withMessage('Invalid category'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required'),
  body('location.room').notEmpty().withMessage('Room is required'),
  body('location.building').notEmpty().withMessage('Building is required'),
  body('location.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('maxParticipants').isInt({ min: 1 }).withMessage('Max participants must be at least 1')
];

// Public routes (with optional auth for better UX)
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Protected routes - any authenticated user
router.get('/my/events', authenticate, eventController.getMyEvents);
router.get('/my/upcoming', authenticate, eventController.getMyUpcomingEvents);
router.get('/my/registered', authenticate, eventController.getMyRegisteredEvents);
router.get('/attended', authenticate, eventController.getAttendedEvents);
router.post('/:id/register', authenticate, eventController.registerForEvent);
router.delete('/:id/unregister', authenticate, eventController.unregisterFromEvent);
router.post('/:id/feedback', authenticate, eventController.submitFeedback);

// Protected routes - teacher or admin only
router.post('/', authenticate, isTeacherOrAdmin, createEventValidation, eventController.createEvent);
router.put('/:id', authenticate, isTeacherOrAdmin, eventController.updateEvent);

// Protected routes - admin only
router.get('/admin/all', authenticate, isAdmin, eventController.getAllEventsAdmin);
router.delete('/:id', authenticate, isAdmin, eventController.deleteEvent);
router.put('/:id/status', authenticate, isAdmin, eventController.updateEventStatus);

module.exports = router;