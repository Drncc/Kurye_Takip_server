const Courier = require('../models/courier');

async function findNearestActiveCourier(point) {
  // point: { type: 'Point', coordinates: [lng, lat] }
  const courier = await Courier.findOne({
    active: true,
    location: {
      $near: {
        $geometry: point,
        $maxDistance: 10000 // 10km; ihtiyaca göre ayarlayın
      }
    }
  }).lean();
  return courier || null;
}

module.exports = { findNearestActiveCourier };