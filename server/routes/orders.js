const express = require('express');
const Order = require('../models/order');
const Shop = require('../models/shop');
const Courier = require('../models/courier');
const auth = require('../middleware/auth');

const router = express.Router();

// Yeni sipariş oluştur
router.post('/', auth('store'), async (req, res) => {
  try {
    const { customerName, customerPhone, deliveryAddress, deliveryDistrict, packageDetails, priority, deliveryCoords } = req.body;
    
    if (!customerName || !customerPhone || !deliveryAddress || !deliveryDistrict || !packageDetails) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Dükkan bilgilerini al
    const shop = await Shop.findById(req.user.id);
    if (!shop) {
      return res.status(404).json({ error: 'Dükkan bulunamadı' });
    }

    // Delivery location oluştur
    let deliveryLocation = null;
    if (deliveryCoords && deliveryCoords.lng && deliveryCoords.lat) {
      deliveryLocation = {
        type: 'Point',
        coordinates: [deliveryCoords.lng, deliveryCoords.lat]
      };
    }

    // Sipariş oluştur
    const order = new Order({
      shop: req.user.id,
      customerName,
      customerPhone,
      deliveryAddress: `${deliveryAddress}, ${deliveryDistrict}`,
      deliveryDistrict,
      deliveryLocation,
      packageDetails,
      priority: priority || 'normal',
      status: 'pending'
    });

    await order.save();

    // En yakın müsait kuryeyi bul ve ata (daha geniş arama)
    const nearbyCourier = await Courier.findOne({
      active: true,
      status: 'available'
    }).sort({
      location: {
        $near: {
          $geometry: shop.location,
          $maxDistance: 50000 // 50km - daha geniş arama
        }
      }
    });

    let assignedCourier = null;
    if (nearbyCourier) {
      order.assignedCourier = nearbyCourier._id;
      order.status = 'assigned';
      order.assignedAt = new Date();
      await order.save();
      
      // Kurye durumunu güncelle
      await Courier.findByIdAndUpdate(nearbyCourier._id, { status: 'busy' });
      
      assignedCourier = {
        _id: nearbyCourier._id,
        name: nearbyCourier.name,
        phone: nearbyCourier.phone
      };
    }

    res.status(201).json({ 
      message: 'Sipariş oluşturuldu',
      order,
      assignedCourier
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

// Dükkan siparişlerini getir
router.get('/store', auth('store'), async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.user.id })
      .populate('assignedCourier', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json({ orders });
  } catch (error) {
    console.error('Store orders fetch error:', error);
    res.status(500).json({ error: 'Siparişler alınamadı' });
  }
});

// Kurye siparişlerini getir
router.get('/mine', auth('courier'), async (req, res) => {
  try {
    const orders = await Order.find({ 
      assignedCourier: req.user.id,
      status: { $in: ['assigned', 'picked', 'delivered'] }
    })
      .populate('shop', 'name addressText location')
      .sort({ createdAt: -1 });
    
    res.json({ orders });
  } catch (error) {
    console.error('Courier orders fetch error:', error);
    res.status(500).json({ error: 'Siparişler alınamadı' });
  }
});

// Sipariş durumunu güncelle
router.post('/:id/status', auth(), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Yetki kontrolü
    if (req.user.role === 'store' && order.shop.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Bu siparişi güncelleyemezsiniz' });
    }
    
    if (req.user.role === 'courier' && order.assignedCourier?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Bu siparişi güncelleyemezsiniz' });
    }

    // Durum geçiş kuralları
    if (req.user.role === 'store') {
      // Dükkan sadece bekleyen siparişleri iptal edebilir
      if (status === 'cancelled' && order.status !== 'pending') {
        return res.status(400).json({ error: 'Sadece bekleyen siparişler iptal edilebilir' });
      }
    } else if (req.user.role === 'courier') {
      // Kurye sadece atanan ve alınan siparişleri güncelleyebilir
      if (!['assigned', 'picked'].includes(order.status)) {
        return res.status(400).json({ error: 'Bu durumda sipariş güncellenemez' });
      }
      
      if (status === 'picked' && order.status !== 'assigned') {
        return res.status(400).json({ error: 'Sadece atanan siparişler alınabilir' });
      }
      
      if (status === 'delivered' && order.status !== 'picked') {
        return res.status(400).json({ error: 'Sadece alınan siparişler teslim edilebilir' });
      }
    }

    // Durumu güncelle
    order.status = status;
    
    // Zaman damgalarını güncelle
    if (status === 'picked') {
      order.pickedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.actualDeliveryTime = new Date();
      
      // Kurye durumunu available yap
      if (order.assignedCourier) {
        await Courier.findByIdAndUpdate(order.assignedCourier, { status: 'available' });
      }
    }

    await order.save();
    
    res.json({ 
      message: 'Sipariş durumu güncellendi',
      order 
    });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

// Kurye için sipariş detaylarını getir
router.get('/:id/details', auth('courier'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('shop', 'name addressText location')
      .populate('assignedCourier', 'name phone');
    
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }
    
    if (order.assignedCourier?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Bu siparişi görüntüleyemezsiniz' });
    }
    
    res.json({ order });
  } catch (error) {
    console.error('Order details fetch error:', error);
    res.status(500).json({ error: 'Sipariş detayları alınamadı' });
  }
});

module.exports = router;