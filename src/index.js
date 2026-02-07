require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://frontend-one-pearl-64.vercel.app',
  ],
  credentials: true,
}));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Feed India API is running',
    timestamp: new Date().toISOString(),
    mode: 'payment-simulation',
  });
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🍲 Feed India Backend API                        ║
║                                                    ║
║   Server running on port ${PORT}                      ║
║   Mode: Payment Simulation                         ║
║   Health: http://localhost:${PORT}/api/health         ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

