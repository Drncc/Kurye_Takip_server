const express = require('express');
const cors = require('cors');
const connectDb = require('./config/db');
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const courierRoutes = require('./routes/couriers');
const orderRoutes = require('./routes/orders');
const path = require('path');

const app = express();
app.use(cors());
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
app.listen(PORT, () => console.log(`API running on ${PORT}`));