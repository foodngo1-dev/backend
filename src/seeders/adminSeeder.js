require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');

// Models
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting admin seeder...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@feedindia.org' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('   Email: admin@feedindia.org');
      console.log('   Password: admin123');
    } else {
      // Create admin user
      const admin = await User.create({
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

      console.log('✅ Admin user created successfully!');
      console.log('   Email: admin@feedindia.org');
      console.log('   Password: admin123');
    }

    console.log('\n🌱 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
