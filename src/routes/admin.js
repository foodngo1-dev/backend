const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const Contact = require('../models/Contact');
const { protect, admin } = require('../middleware/auth');

// Apply authentication and admin check to all routes
router.use(protect);
router.use(admin);

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalDonations,
      totalUsers,
      activeUsers,
      pendingDonations,
      completedDonations,
      totalFundsResult,
      monthlyDonations,
      lastMonthDonations,
    ] = await Promise.all([
      Donation.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Donation.countDocuments({ status: 'pending' }),
      Donation.countDocuments({ status: { $in: ['completed', 'delivered'] } }),
      Donation.aggregate([
        { $match: { type: 'monetary', status: { $in: ['completed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Donation.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Donation.countDocuments({ 
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
      }),
    ]);

    const totalFunds = totalFundsResult[0]?.total || 0;
    const estimatedMeals = Math.floor(totalFunds / 25); // ₹25 per meal estimate
    const donationChange = lastMonthDonations > 0 
      ? Math.round(((monthlyDonations - lastMonthDonations) / lastMonthDonations) * 100)
      : 100;

    res.status(200).json({
      success: true,
      stats: {
        totalDonations,
        totalUsers,
        activeUsers,
        pendingDonations,
        completedDonations,
        totalFunds,
        estimatedMeals,
        monthlyDonations,
        donationChange,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/donations
// @desc    Get all donations with filters
// @access  Admin
router.get('/donations', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }
    if (req.query.search) {
      query.$or = [
        { donationId: new RegExp(req.query.search, 'i') },
        { foodItem: new RegExp(req.query.search, 'i') },
      ];
    }

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('donor', 'name email userType')
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

// @route   PUT /api/admin/donations/:id/status
// @desc    Update donation status
// @access  Admin
router.put('/donations/:id/status', async (req, res, next) => {
  try {
    const { status, description, recipient } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    // Status title mapping
    const statusTitles = {
      'pending': 'Donation Pending',
      'pickup-scheduled': 'Pickup Scheduled',
      'in-transit': 'In Transit',
      'quality-check': 'Quality Check',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };

    donation.status = status;
    donation.timeline.push({
      status,
      title: statusTitles[status] || status,
      description: description || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    if (recipient) {
      donation.recipient = recipient;
    }

    if (status === 'delivered' || status === 'completed') {
      donation.deliveredAt = new Date();
    }

    await donation.save();

    res.status(200).json({
      success: true,
      message: 'Donation status updated',
      donation,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Admin
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (req.query.userType) {
      query.userType = req.query.userType;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID with their donations and payments
// @access  Admin
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const [donations, payments] = await Promise.all([
      Donation.find({ donor: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Payment.find({ user: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      user,
      donations,
      payments,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status
// @access  Admin
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User status updated',
      user,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/contacts
// @desc    Get all contact inquiries
// @access  Admin
router.get('/contacts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      contacts,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/contacts/:id
// @desc    Update contact inquiry
// @access  Admin
router.put('/contacts/:id', async (req, res, next) => {
  try {
    const { status, responseMessage } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (responseMessage) {
      updateData.responseMessage = responseMessage;
      updateData.respondedAt = new Date();
      updateData.respondedBy = req.user.id;
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact inquiry updated',
      contact,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/analytics/donations
// @desc    Get donation analytics
// @access  Admin
router.get('/analytics/donations', async (req, res, next) => {
  try {
    const [byType, byStatus, monthly, topDonorsResult] = await Promise.all([
      Donation.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Donation.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Donation.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
      User.find()
        .sort({ donationsCount: -1, totalAmountDonated: -1 })
        .limit(10)
        .select('name email userType donationsCount totalAmountDonated')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        byType,
        byStatus,
        monthly,
        topDonors: topDonorsResult,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
