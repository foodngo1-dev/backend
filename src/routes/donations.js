const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/donations
// @desc    Create a new donation
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      type,
      foodItem,
      quantity,
      bestBefore,
      amount,
      paymentMethod,
      purpose,
      supplyItems,
      location,
      notes,
    } = req.body;

    // Validate based on type
    if (type === 'food' && (!foodItem || !quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Food donations require foodItem and quantity',
      });
    }

    if (type === 'monetary' && !amount) {
      return res.status(400).json({
        success: false,
        message: 'Monetary donations require an amount',
      });
    }

    // Create donation
    const donation = await Donation.create({
      donor: req.user.id,
      type,
      foodItem,
      quantity,
      bestBefore,
      amount,
      paymentMethod,
      purpose: purpose || 'general',
      supplyItems,
      location,
      notes,
    });

    // Update user donation count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 
        donationsCount: 1,
        ...(type === 'monetary' && amount ? { totalAmountDonated: amount } : {}),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      donation: {
        _id: donation._id,
        donationId: donation.donationId,
        type: donation.type,
        status: donation.status,
        createdAt: donation.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/donations
// @desc    Get user's donations
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { donor: req.user.id };

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: donations.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      donations,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/donations/:id
// @desc    Get donation by ID
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email userType');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // Check if user owns the donation or is admin
    if (donation.donor._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this donation',
      });
    }

    res.status(200).json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/donations/track/:donationId
// @desc    Track donation by donation ID (public)
// @access  Public
router.get('/track/:donationId', async (req, res, next) => {
  try {
    const donation = await Donation.findOne({ donationId: req.params.donationId });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found. Please check the donation ID.',
      });
    }

    // Return all donation fields for complete tracking
    res.status(200).json({
      success: true,
      donation: {
        _id: donation._id,
        donationId: donation.donationId,
        type: donation.type,
        status: donation.status,
        // Food donation fields
        foodItem: donation.foodItem,
        quantity: donation.quantity,
        bestBefore: donation.bestBefore,
        // Monetary donation fields
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        purpose: donation.purpose,
        // Supplies donation fields
        supplyItems: donation.supplyItems,
        // Common fields
        location: donation.location,
        notes: donation.notes,
        recipient: donation.recipient,
        timeline: donation.timeline,
        createdAt: donation.createdAt,
        deliveredAt: donation.deliveredAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/donations/:id/cancel
// @desc    Cancel a donation
// @access  Private
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // Check if user owns the donation
    if (donation.donor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this donation',
      });
    }

    // Check if donation can be cancelled
    if (!['pending', 'pickup-scheduled'].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel donation at this stage',
      });
    }

    donation.status = 'cancelled';
    donation.cancelledAt = new Date();
    donation.cancelReason = req.body.reason || 'Cancelled by user';
    donation.timeline.push({
      status: 'cancelled',
      title: 'Donation Cancelled',
      description: req.body.reason || 'Cancelled by user',
      timestamp: new Date(),
    });

    await donation.save();

    res.status(200).json({
      success: true,
      message: 'Donation cancelled successfully',
      donation,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
