const express = require('express');
const cors = require('cors');
const connectDb = require('./config/db');
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const courierRoutes = require('./routes/couriers');
const orderRoutes = require('./routes/orders');
const path = require('path');

const app = express();
app.use(cors({
  origin: true, // Tüm origin'lere izin ver (production'da daha güvenli olabilir)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());

connectDb();

app.use('/api/auth', authRoutes);
app.use('/api/couriers', courierRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);

// Admin route - Client ayrı deploy edileceği için bu route kaldırıldı
// app.get('/admin', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/index.html'));
// });

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));