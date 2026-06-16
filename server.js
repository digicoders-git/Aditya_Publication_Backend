require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoutes');
const path = require('path');

const app = express();

connectDB();

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Dynamically echo back any requesting origin to resolve all CORS port clashes on localhost
    callback(null, true);
  },
  credentials: true,
}));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/books', publicRoutes);
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/offers', require('express').Router().get('/', require('./controllers/offerController').getActiveOffers));
app.use('/api/news', require('express').Router().get('/', require('./controllers/newsController').getPublishedNews));

app.get('/', (req, res) => res.json({ message: 'Bookinform API running' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
