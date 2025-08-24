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
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active parametresi boolean olmalı' });
    }
    
    const status = active ? 'available' : 'offline';
    
    // Eğer kurye pasif yapılıyorsa, tüm aktif siparişlerini iptal et
    if (!active) {
      await Order.updateMany(
        { 
          assignedCourier: req.user.id, 
          status: { $in: ['assigned', 'picked'] } 
        },
        { 
          status: 'pending', 
          assignedCourier: null,
          assignedAt: null
        }
      );
    }
    
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

// Kurye konum güncelleme (GPS koordinatları ile)
router.post('/location', auth('courier'), async (req, res) => {
  try {
    const { coords } = req.body; // coords: { lng, lat }
    
    if (!coords || typeof coords.lng !== 'number' || typeof coords.lat !== 'number') {
      return res.status(400).json({ error: 'Geçerli GPS koordinatları gerekli (lng ve lat)' });
    }
    
    const location = { 
      type: 'Point', 
      coordinates: [coords.lng, coords.lat] 
    };
    
    await Courier.findByIdAndUpdate(
      req.user.id, 
      { location }, 
      { new: true }
    );
    
    res.json({ 
      ok: true, 
      message: 'Konum güncellendi',
      coordinates: [coords.lng, coords.lat]
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Konum güncellenemedi' });
  }
});

// Yakındaki aktif kuryeleri getir (sadece backend için, harita göstermeyecek)
router.post('/nearby', auth('shop'), async (req, res) => {
  const { pickup } = req.body; // { type:'Point', coordinates:[lng,lat] }
  if (!pickup || !pickup.coordinates) return res.status(400).json({ error: 'pickup required' });
  const items = await Courier.find({
    active: true,
    status: 'available',
    location: {
      $near: {
        $geometry: pickup,
        $maxDistance: 100000 // 100km
      }
    }
  })
    .select('name phone status')
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