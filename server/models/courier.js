const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  // Konum bilgisi sadece backend'de tutulacak, haritada gösterilmeyecek
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [31.9957, 36.5441] // Alanya merkez
    }
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  }
}, {
  timestamps: true
});

// Geospatial index
courierSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Courier', courierSchema);