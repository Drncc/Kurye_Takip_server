const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Shop = require('../models/shop');
const Courier = require('../models/courier');
const { geocodeAddressToPoint } = require('../utils/geocode');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register/shop', async (req, res) => {
  try {
    const { name, email, password, addressText, district, coordinates } = req.body;
    
    if (!name || !email || !password || !addressText || !district) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }
    
    // Aynı e-posta kontrolü
    const existingShop = await Shop.findOne({ email: email.toLowerCase() });
    if (existingShop) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi deneyin.' });
    }
    
    let location;
    
    // Eğer GPS koordinatları verilmişse onları kullan
    if (coordinates && coordinates.lng && coordinates.lat) {
      location = {
        type: 'Point',
        coordinates: [Number(coordinates.lng), Number(coordinates.lat)]
      };
    } else {
      // Yoksa adresten otomatik al
      location = await geocodeAddressToPoint(addressText);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const shop = await Shop.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hashedPassword, 
      addressText, 
      district, 
      location 
    });
    
    const token = jwt.sign({ id: shop._id, role: 'shop' }, jwtSecret, { expiresIn: '7d' });
    res.json({ 
      message: 'Dükkan kaydı başarılı',
      token,
      shop: {
        _id: shop._id,
        name: shop.name,
        email: shop.email,
        addressText: shop.addressText,
        district: shop.district,
        location: shop.location
      }
    });
  } catch (e) { 
    console.error('Shop registration error:', e);
    res.status(400).json({ error: e.message }); 
  }
});

router.post('/register/courier', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Email kontrolü
    const existingCourier = await Courier.findOne({ email: email.toLowerCase() });
    if (existingCourier) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const courier = new Courier({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      location: {
        type: 'Point',
        coordinates: [31.9957, 36.5441] // Alanya merkez
      }
    });

    await courier.save();
    
    const token = jwt.sign({ userId: courier._id, role: 'courier' }, jwtSecret, { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'Kurye kaydı başarılı', 
      token,
      courier: {
        _id: courier._id,
        name: courier.name,
        email: courier.email,
        phone: courier.phone
      }
    });
  } catch (error) {
    console.error('Courier kayıt hatası:', error);
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
  }
});

router.post('/login/shop', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
    }
    
    const shop = await Shop.findOne({ email: email.toLowerCase() });
    if (!shop) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }
    
    const isValidPassword = await bcrypt.compare(password, shop.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }
    
    const token = jwt.sign({ id: shop._id, role: 'shop' }, jwtSecret, { expiresIn: '7d' });
    res.json({ 
      message: 'Giriş başarılı',
      token,
      shop: {
        _id: shop._id,
        name: shop.name,
        email: shop.email,
        addressText: shop.addressText,
        district: shop.district
      }
    });
  } catch (error) {
    console.error('Shop login hatası:', error);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

router.post('/login/courier', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const courier = await Courier.findOne({ email: email.toLowerCase() });
    if (!courier) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const isValidPassword = await bcrypt.compare(password, courier.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const token = jwt.sign({ userId: courier._id, role: 'courier' }, jwtSecret, { expiresIn: '7d' });
    
    res.json({ 
      message: 'Giriş başarılı', 
      token,
      courier: {
        _id: courier._id,
        name: courier.name,
        email: courier.email,
        phone: courier.phone
      }
    });
  } catch (error) {
    console.error('Courier login hatası:', error);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
});

module.exports = router;