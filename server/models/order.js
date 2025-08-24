const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  deliveryDistrict: { type: String, required: true },
  deliveryLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [lng, lat]
  },
  packageDetails: { type: String, required: true },
  priority: { type: String, enum: ['normal', 'urgent', 'express'], default: 'normal' },
  status: { type: String, enum: ['pending', 'assigned', 'picked', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  assignedAt: { type: Date },
  pickedAt: { type: Date },
  deliveredAt: { type: Date },
  estimatedDeliveryTime: { type: Date },
  actualDeliveryTime: { type: Date }
}, { timestamps: true });

// Geospatial index for delivery location
orderSchema.index({ deliveryLocation: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);