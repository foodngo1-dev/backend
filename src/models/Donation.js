const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const donationSchema = new mongoose.Schema({
  donationId: {
    type: String,
    unique: true,
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['food', 'monetary', 'supplies'],
    required: [true, 'Please specify donation type'],
  },
  // Food donation fields
  foodItem: {
    type: String,
  },
  quantity: {
    type: String,
  },
  bestBefore: {
    type: String,
  },
  // Monetary donation fields
  amount: {
    type: Number,
    min: [0, 'Amount must be positive'],
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank', 'card', 'cash'],
  },
  purpose: {
    type: String,
    enum: ['general', 'meals', 'fleet', 'training', 'awareness'],
    default: 'general',
  },
  // Supplies donation fields
  supplyItems: [{
    name: String,
    quantity: String,
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair'],
    },
  }],
  // Common fields
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
  },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'pickup-scheduled', 'in-transit', 'quality-check', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
  },
  recipient: {
    name: String,
    type: {
      type: String,
      enum: ['shelter', 'orphanage', 'school', 'hospital', 'community-kitchen', 'other'],
    },
    location: String,
  },
  timeline: [timelineSchema],
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Generate donation ID before saving
donationSchema.pre('save', async function (next) {
  if (!this.donationId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Donation').countDocuments();
    this.donationId = `DON-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Add initial timeline entry when donation is created
donationSchema.pre('save', function (next) {
  if (this.isNew && this.timeline.length === 0) {
    this.timeline.push({
      status: 'pending',
      title: 'Donation Received',
      description: 'Your generous donation has been registered in our system',
      timestamp: new Date(),
    });
  }
  next();
});

// Virtual for id
donationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Index for better search performance
donationSchema.index({ donationId: 1 });
donationSchema.index({ donor: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ type: 1 });
donationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);
