module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'feed-india-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  PAYMENT_SIMULATION_DELAY: 1500, // ms delay to simulate payment processing
  DONATION_STATUSES: ['pending', 'pickup-scheduled', 'in-transit', 'quality-check', 'delivered', 'completed', 'cancelled'],
  PAYMENT_METHODS: ['upi', 'bank', 'card', 'cash'],
  DONATION_TYPES: ['food', 'monetary', 'supplies'],
  USER_TYPES: ['individual', 'organization', 'corporate'],
  DONATION_PURPOSES: ['general', 'meals', 'fleet', 'training', 'awareness'],
};
