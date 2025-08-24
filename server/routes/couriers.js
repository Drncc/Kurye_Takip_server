const express = require('express');
const Courier = require('../models/courier');
const auth = require('../middleware/auth');
const { geocodeAddressToPoint } = require('../utils/geocode');

const router = express.Router();

router.get('/me', auth('courier'), async (req, res) => {
  const me = await Courier.findById(req.user.id).lean();
  res.json({ me });
});

router.post('/status', auth('courier'), async (req, res) => {
  try {
    const { active } = req.body;
    const status = active ? 'available' : 'offline';
    
    const updated = await Courier.findByIdAndUpdate(
      req.user.id, 
      { active, status }, 
      { new: true }
    ).lean();
    
    res.json({ 
      active: updated.active, 
      status: updated.status,
      message: active ? 'Kurye aktif' : 'Kurye pasif'
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

router.post('/location', auth('courier'), async (req, res) => {
  try {
    const { addressText, coords } = req.body; // coords: { lng, lat }
    let location;
    
    if (coords && coords.lng && coords.lat) {
      location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
    } else if (addressText) {
      location = await geocodeAddressToPoint(addressText);
    } else {
      return res.status(400).json({ error: 'Provide addressText or coords' });
    }
    
    const updated = await Courier.findByIdAndUpdate(
      req.user.id, 
      { location }, 
      { new: true }
    );
    
    res.json({ 
      ok: true, 
      location: updated.location,
      message: 'Konum güncellendi'
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Konum güncellenemedi' });
  }
});

// List nearby active couriers for a given pickup point (shop)
router.post('/nearby', auth('shop'), async (req, res) => {
  const { pickup } = req.body; // { type:'Point', coordinates:[lng,lat] }
  if (!pickup || !pickup.coordinates) return res.status(400).json({ error: 'pickup required' });
  const items = await Courier.find({
    active: true,
    location: {
      $near: {
        $geometry: pickup,
        $maxDistance: 20000
      }
    }
  })
    .select('name location createdAt addressText phone')
    .limit(10)
    .lean();
  res.json({ couriers: items });
});

// Tüm kuryeleri getir (Admin)
router.get('/all', async (req, res) => {
  try {
    const couriers = await Courier.find({}).sort({ createdAt: -1 });
    res.json({ couriers });
  } catch (error) {
    res.status(500).json({ error: 'Kuryeler alınamadı' });
  }
});

// Kurye sil (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const courier = await Courier.findByIdAndDelete(req.params.id);
    if (!courier) {
      return res.status(404).json({ error: 'Kurye bulunamadı' });
    }
    res.json({ message: 'Kurye silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Kurye silinemedi' });
  }
});

module.exports = router;