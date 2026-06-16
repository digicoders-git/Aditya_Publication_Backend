const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, required: true },
  image: { type: String, default: null },
  author: { type: String, default: 'Admin', trim: true },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);
