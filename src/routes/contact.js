const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');

// Email configuration - using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,       // CHANGE: 587 -> 465
    secure: true,
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password',
    },
  });
};

// Send email function
const sendContactEmail = async (contactData) => {
  
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"Feed India Contact Form" <${process.env.EMAIL_USER || 'noreply@feedindia.org'}>`,
    to: 'foodngo1@gmail.com',
    replyTo: contactData.email,
    subject: `[Feed India] New ${contactData.subject} Inquiry from ${contactData.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🍲 Feed India</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">New Contact Form Submission</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Contact Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Ticket ID:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #22c55e;">${contactData.ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${contactData.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <a href="mailto:${contactData.email}" style="color: #22c55e; text-decoration: none;">${contactData.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Subject:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${contactData.subject}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Priority:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="background: ${contactData.priority === 'high' ? '#fef2f2' : contactData.priority === 'medium' ? '#fffbeb' : '#f0fdf4'}; 
                               color: ${contactData.priority === 'high' ? '#dc2626' : contactData.priority === 'medium' ? '#d97706' : '#16a34a'}; 
                               padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                    ${contactData.priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">Submitted:</td>
                <td style="padding: 10px 0;">${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</td>
              </tr>
            </table>
            
            <div style="margin-top: 25px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Message</h3>
              <p style="color: #1f2937; margin: 0; line-height: 1.6; white-space: pre-wrap;">${contactData.message}</p>
            </div>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This email was sent from Feed India Contact Form</p>
          <p style="margin: 5px 0 0 0;">Reply directly to this email to respond to ${contactData.name}</p>
        </div>
      </div>
    `,
    text: `
Feed India - New Contact Form Submission
=========================================

Ticket ID: ${contactData.ticketId}
Name: ${contactData.name}
Email: ${contactData.email}
Subject: ${contactData.subject}
Priority: ${contactData.priority}
Submitted: ${new Date().toLocaleString('en-IN')}

Message:
${contactData.message}

---
Reply directly to this email to respond to ${contactData.name}
    `,
  };

  return transporter.sendMail(mailOptions);
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


