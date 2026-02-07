const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// EmailJS configuration using REST API
const sendContactEmail = async (contactData) => {
  const emailJSConfig = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    accessToken: process.env.EMAILJS_PRIVATE_KEY,
  };

  const templateParams = {
    to_email: process.env.CONTACT_EMAIL || 'foodngo1@gmail.com',
    from_name: contactData.name,
    from_email: contactData.email,
    ticket_id: contactData.ticketId,
    subject: contactData.subject,
    message: contactData.message,
    priority: contactData.priority,
    submitted_date: new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }),
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: emailJSConfig.service_id,
      template_id: emailJSConfig.template_id,
      user_id: emailJSConfig.user_id,
      accessToken: emailJSConfig.accessToken,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    throw new Error(`EmailJS API error: ${response.statusText}`);
  }

  return response;
};

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

    // Send email notification
    try {
      await sendContactEmail({
        ticketId: contact.ticketId,
        name,
        email,
        subject,
        message,
        priority,
      });
      console.log(`✉️ Contact email sent successfully for ticket ${contact.ticketId}`);
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError.message);
      // Don't fail the request if email fails - the contact is still saved
    }

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
