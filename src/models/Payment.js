const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  donation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
  },
  orderId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
    default: 'created',
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank', 'card', 'cash'],
  },
  donationType: String,
  description: String,
  receipt: String,
  receiptId: String,
  // Simulated payment details
  simulatedDetails: {
    upiId: String,
    cardLast4: String,
    bankName: String,
    transactionRef: String,
  },
  paidAt: Date,
  failedAt: Date,
  failureReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Generate payment ID and order ID before saving
paymentSchema.pre('save', async function (next) {
  if (!this.paymentId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.paymentId = `PAY-${timestamp}-${random}`;
  }
  next();
});

// Virtual for id
paymentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Index for better search performance
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
