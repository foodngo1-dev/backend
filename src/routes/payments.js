const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { PAYMENT_SIMULATION_DELAY } = require('../config/config');

// Helper function to generate IDs
const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const generateReceiptId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `RCPT-${year}-${random}`;
};

const generateTransactionRef = () => {
  return Math.random().toString(36).substring(2, 18).toUpperCase();
};

// @route   POST /api/payments/create-order
// @desc    Create a new payment order (simulated)
// @access  Private
router.post('/create-order', protect, async (req, res, next) => {
  try {
    const { amount, donationType, description } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1',
      });
    }

    const orderId = generateOrderId();

    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      orderId,
      amount,
      donationType,
      description,
      status: 'created',
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created',
      order: {
        id: orderId,
        amount,
        currency: 'INR',
      },
      orderId,
      paymentId: payment.paymentId,
      mode: 'simulation',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments/verify
// @desc    Verify and complete payment (simulated)
// @access  Private
router.post('/verify', protect, async (req, res, next) => {
  try {
    const { orderId, paymentId, amount, donationType, paymentMethod } = req.body;

    // Find the payment
    let payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found',
      });
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, PAYMENT_SIMULATION_DELAY));

    // Simulate payment success (95% success rate)
    const isSuccess = Math.random() < 0.95;

    if (!isSuccess) {
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = 'Simulated payment failure';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again.',
      });
    }

    // Generate receipt
    const receiptId = generateReceiptId();

    // Update payment
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.receiptId = receiptId;
    payment.paymentMethod = paymentMethod || 'card';
    
    // Add simulated details based on payment method
    switch (paymentMethod) {
      case 'upi':
        payment.simulatedDetails = {
          upiId: 'user@upi',
          transactionRef: generateTransactionRef(),
        };
        break;
      case 'card':
        payment.simulatedDetails = {
          cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
          transactionRef: generateTransactionRef(),
        };
        break;
      case 'bank':
        payment.simulatedDetails = {
          bankName: 'Sample Bank',
          transactionRef: generateTransactionRef(),
        };
        break;
      case 'cash':
        payment.simulatedDetails = {
          transactionRef: generateTransactionRef(),
        };
        break;
      default:
        payment.simulatedDetails = {
          transactionRef: generateTransactionRef(),
        };
    }

    await payment.save();

    // Create a monetary donation record
    const donation = await Donation.create({
      donor: req.user.id,
      type: 'monetary',
      amount: payment.amount,
      paymentMethod: paymentMethod || 'card',
      purpose: donationType || 'general',
      status: 'completed',
      notes: payment.description,
      timeline: [
        {
          status: 'completed',
          title: 'Payment Received',
          description: `₹${payment.amount} received via ${paymentMethod || 'card'}`,
          timestamp: new Date(),
        },
      ],
    });

    // Link donation to payment
    payment.donation = donation._id;
    await payment.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        donationsCount: 1,
        totalAmountDonated: payment.amount,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment successful! Thank you for your donation.',
      receiptId,
      payment: {
        id: payment.paymentId,
        amount: payment.amount,
        donationId: donation.donationId,
        receiptId,
        method: payment.paymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('donation', 'donationId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      payments,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('donation', 'donationId type amount');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user owns the payment or is admin
    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
