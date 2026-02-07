const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// @route   POST /api/contact
// @desc    Submit a contact inquiry
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, subject, and message',
      });
    }

    // Determine priority based on subject
    let priority = 'medium';
    if (subject === 'technical') {
      priority = 'high';
    } else if (subject === 'general') {
      priority = 'low';
    }

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      priority,
    });

    console.log(`✅ Contact saved successfully with ticket ${contact.ticketId}`);

    res.status(201).json({
      success: true,
      message: 'Your message has been sent. We will get back to you within 24 hours.',
      ticketId: contact.ticketId,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/contact/my-inquiries
// @desc    Get inquiries by email
// @access  Public
router.get('/my-inquiries', async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email',
      });
    }

    const inquiries = await Contact.find({ email })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
