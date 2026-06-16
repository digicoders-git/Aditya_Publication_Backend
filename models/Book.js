const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  oldPrice: {
    type: Number,
    default: null,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  pages: {
    type: Number,
  },
  language: {
    type: String,
    default: 'English',
  },
  image: {
    type: String,
    default: null, // Thumbnail URL
  },
  pdfUrl: {
    type: String,
    default: null, // PDF file URL
  },
  bookType: {
    type: String,
    enum: ['pdf', 'hardbook', 'both'],
    default: 'pdf',
  },
  badge: {
    type: String, // Bestseller, New, etc.
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  discount: {
    type: Number,
    default: 0, // Percentage
  },
  isRecommended: {
    type: Boolean,
    default: false,
  },
  isSpecialOffer: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isTopBook: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
