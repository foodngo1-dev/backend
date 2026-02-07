require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');

// Models
const User = require('../models/User');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const Contact = require('../models/Contact');

const seedAll = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting full seeder...\n');

    // =====================================
    // 1. Create Admin User
    // =====================================
    let admin = await User.findOne({ email: 'admin@feedindia.org' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@feedindia.org',
        password: 'admin123',
        userType: 'organization',
        role: 'admin',
        status: 'active',
        phone: '+91 98765 43210',
        address: {
          street: '123 Mission Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists');
    }

    // =====================================
    // 2. Create Sample Users
    // =====================================
    const sampleUsers = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        password: 'password123',
        userType: 'individual',
        phone: '+91 98765 00001',
        address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      },
      {
        name: 'Priya Foods Ltd',
        email: 'contact@priyafoods.com',
        password: 'password123',
        userType: 'corporate',
        phone: '+91 98765 00002',
        address: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
      },
      {
        name: 'Hope Foundation',
        email: 'info@hopefoundation.org',
        password: 'password123',
        userType: 'organization',
        phone: '+91 98765 00003',
        address: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      },
      {
        name: 'Amit Sharma',
        email: 'amit.sharma@example.com',
        password: 'password123',
        userType: 'individual',
        phone: '+91 98765 00004',
        address: { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
      },
      {
        name: 'Green Grocers',
        email: 'green@grocers.com',
        password: 'password123',
        userType: 'corporate',
        phone: '+91 98765 00005',
        address: { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    ];

    const createdUsers = [];
    for (const userData of sampleUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
        console.log(`✅ Created user: ${userData.name}`);
      } else {
        console.log(`✅ User exists: ${userData.name}`);
      }
      createdUsers.push(user);
    }

    // =====================================
    // 3. Create Sample Donations
    // =====================================
    const sampleDonations = [
      {
        donor: createdUsers[0]._id,
        type: 'food',
        foodItem: 'Rice & Dal',
        quantity: '50 kg',
        bestBefore: '2024-02-15',
        location: { city: 'Mumbai', state: 'Maharashtra' },
        status: 'delivered',
        recipient: { name: 'Hope Shelter', type: 'shelter', location: 'Andheri East' },
        timeline: [
          { status: 'pending', title: 'Donation Received', description: 'Donation registered', timestamp: new Date('2024-01-15T10:00:00') },
          { status: 'pickup-scheduled', title: 'Pickup Scheduled', description: 'Volunteer assigned', timestamp: new Date('2024-01-15T11:00:00') },
          { status: 'in-transit', title: 'In Transit', description: 'On the way to distribution center', timestamp: new Date('2024-01-15T14:00:00') },
          { status: 'delivered', title: 'Delivered', description: 'Delivered to Hope Shelter', timestamp: new Date('2024-01-16T10:00:00') },
        ],
        deliveredAt: new Date('2024-01-16T10:00:00'),
      },
      {
        donor: createdUsers[1]._id,
        type: 'food',
        foodItem: 'Ready Meals',
        quantity: '200 plates',
        location: { city: 'Delhi', state: 'Delhi' },
        status: 'in-transit',
        recipient: { name: 'Community Kitchen', type: 'community-kitchen', location: 'Karol Bagh' },
        timeline: [
          { status: 'pending', title: 'Donation Received', description: 'Donation registered', timestamp: new Date('2024-01-16T09:00:00') },
          { status: 'pickup-scheduled', title: 'Pickup Scheduled', description: 'Volunteer assigned', timestamp: new Date('2024-01-16T10:00:00') },
          { status: 'in-transit', title: 'In Transit', description: 'On the way', timestamp: new Date('2024-01-16T12:00:00') },
        ],
      },
      {
        donor: createdUsers[3]._id,
        type: 'monetary',
        amount: 15000,
        paymentMethod: 'upi',
        purpose: 'meals',
        status: 'completed',
        notes: 'For mid-day meal program',
        timeline: [
          { status: 'completed', title: 'Payment Received', description: '₹15,000 received via UPI', timestamp: new Date('2024-01-16T14:00:00') },
        ],
      },
      {
        donor: createdUsers[4]._id,
        type: 'food',
        foodItem: 'Fresh Vegetables',
        quantity: '30 kg',
        bestBefore: '2024-01-20',
        location: { city: 'Chennai', state: 'Tamil Nadu' },
        status: 'pending',
        timeline: [
          { status: 'pending', title: 'Donation Received', description: 'Awaiting pickup', timestamp: new Date('2024-01-17T08:00:00') },
        ],
      },
      {
        donor: createdUsers[2]._id,
        type: 'monetary',
        amount: 50000,
        paymentMethod: 'bank',
        purpose: 'general',
        status: 'completed',
        notes: 'Monthly corporate contribution',
        timeline: [
          { status: 'completed', title: 'Payment Received', description: '₹50,000 received via bank transfer', timestamp: new Date('2024-01-10T10:00:00') },
        ],
      },
    ];

    for (const donationData of sampleDonations) {
      const existingDonation = await Donation.findOne({
        donor: donationData.donor,
        type: donationData.type,
        ...(donationData.foodItem ? { foodItem: donationData.foodItem } : {}),
        ...(donationData.amount ? { amount: donationData.amount } : {}),
      });

      if (!existingDonation) {
        const donation = await Donation.create(donationData);
        console.log(`✅ Created donation: ${donation.donationId}`);
        
        // Update user stats
        await User.findByIdAndUpdate(donationData.donor, {
          $inc: {
            donationsCount: 1,
            ...(donationData.type === 'monetary' ? { totalAmountDonated: donationData.amount } : {}),
          },
        });
      }
    }

    // =====================================
    // 4. Create Sample Payments
    // =====================================
    const monetaryDonations = await Donation.find({ type: 'monetary' });
    for (const donation of monetaryDonations) {
      const existingPayment = await Payment.findOne({ donation: donation._id });
      if (!existingPayment) {
        await Payment.create({
          user: donation.donor,
          donation: donation._id,
          orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
          amount: donation.amount,
          status: 'paid',
          paymentMethod: donation.paymentMethod,
          paidAt: donation.createdAt,
          receiptId: `RCPT-2024-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        });
        console.log(`✅ Created payment for donation: ${donation.donationId}`);
      }
    }

    // =====================================
    // 5. Create Sample Contacts
    // =====================================
    const sampleContacts = [
      {
        name: 'Suresh Verma',
        email: 'suresh@example.com',
        subject: 'volunteer',
        message: 'I would like to volunteer for weekend food distribution.',
        status: 'new',
        priority: 'medium',
      },
      {
        name: 'Tech Corp HR',
        email: 'hr@techcorp.com',
        subject: 'partnership',
        message: 'We are interested in corporate partnership for CSR activities.',
        status: 'in-progress',
        priority: 'high',
      },
      {
        name: 'User123',
        email: 'user@example.com',
        subject: 'technical',
        message: 'I am unable to track my donation. The tracking page shows an error.',
        status: 'new',
        priority: 'high',
      },
    ];

    for (const contactData of sampleContacts) {
      const existingContact = await Contact.findOne({ email: contactData.email, subject: contactData.subject });
      if (!existingContact) {
        const contact = await Contact.create(contactData);
        console.log(`✅ Created contact: ${contact.ticketId}`);
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('🌱 Seeding complete!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📧 Admin Login:');
    console.log('   Email: admin@feedindia.org');
    console.log('   Password: admin123');
    console.log('\n📧 Sample User Login:');
    console.log('   Email: rajesh@example.com');
    console.log('   Password: password123');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedAll();
