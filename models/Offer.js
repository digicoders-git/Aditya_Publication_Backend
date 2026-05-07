const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  image: { type: String, default: null },
  categories: [{ type: String, trim: true }],
  price: { type: Number, required: true },
  oldPrice: { type: Number, default: null },
  discountPercent: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
