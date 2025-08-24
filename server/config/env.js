require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  // MongoDB connection string - production ready
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@kuryetakip.imkinpp.mongodb.net/kurye?retryWrites=true&w=majority&appName=kuryeTakip',
  // Provide a weak dev default; override in production via env
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  nominatimBase: process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org'
};