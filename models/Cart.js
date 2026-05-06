const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [
    {
      book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
      },
      bookType: {
        type: String,
        enum: ['pdf', 'hardbook'],
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
