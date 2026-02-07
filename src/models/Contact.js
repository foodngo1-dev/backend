const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    enum: ['volunteer', 'donation', 'partnership', 'general', 'technical'],
    default: 'general',
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  responseMessage: String,
  respondedAt: Date,
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Generate ticket ID before saving
contactSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Contact').countDocuments();
    this.ticketId = `TKT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Virtual for id
contactSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Index for better search performance
contactSchema.index({ ticketId: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
