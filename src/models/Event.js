const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['Academic', 'Workshop', 'Seminar', 'Social', 'Career', 'Sports', 'Cultural', 'Technical']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  location: {
    room: {
      type: String,
      required: true
    },
    building: {
      type: String,
      required: true
    },
    address: String,
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    virtualLink: String
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  isHybrid: {
    type: Boolean,
    default: false
  },
  registrations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    },
    checkInTime: Date,
    checkOutTime: Date
  }],
  waitlist: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  minParticipants: {
    type: Number,
    default: 1
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'staff', 'specific'],
    default: 'all'
  },
  specificAudience: {
    departments: [String],
    years: [String],
    groups: [String]
  },
  resources: [{
    name: String,
    quantity: Number,
    status: {
      type: String,
      enum: ['requested', 'approved', 'denied'],
      default: 'requested'
    }
  }],
  budget: {
    requested: {
      type: Number,
      default: 0
    },
    approved: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    }
  },
  images: [{
    url: String,
    caption: String
  }],
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiSuggestions: {
    suggestedTime: String,
    predictedAttendance: Number,
    confidenceLevel: Number,
    recommendations: [String]
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: null
    },
    endAfterDate: Date,
    occurrences: Number
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ 'location.room': 1, startDate: 1, endDate: 1 });
eventSchema.index({ tags: 1 });

// Virtual for registration count
eventSchema.virtual('registrationCount').get(function() {
  return this.registrations ? this.registrations.length : 0;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  return this.maxParticipants - (this.registrations ? this.registrations.length : 0);
});

// Virtual for is full
eventSchema.virtual('isFull').get(function() {
  return this.availableSpots <= 0;
});

// Virtual for average rating
eventSchema.virtual('averageRating').get(function() {
  if (!this.feedback || this.feedback.length === 0) return 0;
  const sum = this.feedback.reduce((acc, item) => acc + item.rating, 0);
  return (sum / this.feedback.length).toFixed(1);
});

// Method to check if user is registered
eventSchema.methods.isUserRegistered = function(userId) {
  return this.registrations.some(reg => reg.user.toString() === userId.toString());
};

// Method to register user
eventSchema.methods.registerUser = function(userId) {
  if (this.isFull) {
    throw new Error('Event is full');
  }
  if (this.isUserRegistered(userId)) {
    throw new Error('User already registered');
  }
  this.registrations.push({ user: userId });
  return this.save();
};

// Method to unregister user
eventSchema.methods.unregisterUser = function(userId) {
  this.registrations = this.registrations.filter(
    reg => reg.user.toString() !== userId.toString()
  );
  return this.save();
};

// Ensure virtuals are included in JSON
eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);