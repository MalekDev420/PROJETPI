const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'category'
  },
  color: {
    type: String,
    default: '#667eea'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eventCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Update event count when events are added/removed
categorySchema.methods.updateEventCount = async function() {
  const Event = mongoose.model('Event');
  const count = await Event.countDocuments({ category: this.name });
  this.eventCount = count;
  await this.save();
};

module.exports = mongoose.model('Category', categorySchema);