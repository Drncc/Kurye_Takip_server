const express = require('express');
const auth = require('../middleware/auth');
const Shop = require('../models/shop');

const router = express.Router();

router.get('/me', auth('shop'), async (req, res) => {
  const me = await Shop.findById(req.user.id).lean();
  res.json({ me });
});

// Dükkan konum güncelleme
router.post('/location', auth('shop'), async (req, res) => {
  try {
    const { coordinates } = req.body; // { lng, lat }
    
    if (!coordinates || typeof coordinates.lng !== 'number' || typeof coordinates.lat !== 'number') {
      return res.status(400).json({ error: 'Geçerli GPS koordinatları gerekli (lng ve lat)' });
    }
    
    const location = { 
      type: 'Point', 
      coordinates: [coordinates.lng, coordinates.lat] 
    };
    
    const updated = await Shop.findByIdAndUpdate(
      req.user.id, 
      { location }, 
      { new: true }
    );
    
    res.json({ 
      ok: true, 
      message: 'Konum güncellendi',
      location: updated.location
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Konum güncellenemedi' });
  }
});

// List nearby shops for a given courier location
router.post('/nearby', auth('courier'), async (req, res) => {
  const { courierLocation } = req.body; // { type:'Point', coordinates:[lng,lat] }
  if (!courierLocation || !courierLocation.coordinates) return res.status(400).json({ error: 'courierLocation required' });
  
  const items = await Shop.find({
    location: {
      $near: {
        $geometry: courierLocation,
        $maxDistance: 20000 // 20km
      }
    }
  })
    .select('name addressText location createdAt')
    .limit(10)
    .lean();
    
  res.json({ shops: items });
});

// Tüm dükkanları getir (Admin)
router.get('/all', async (req, res) => {
  try {
    const shops = await Shop.find({}).sort({ createdAt: -1 });
    res.json({ shops });
  } catch (error) {
    res.status(500).json({ error: 'Dükkanlar alınamadı' });
  }
});

// Dükkan sil (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Dükkan bulunamadı' });
    }
    res.json({ message: 'Dükkan silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Dükkan silinemedi' });
  }
});

module.exports = router;