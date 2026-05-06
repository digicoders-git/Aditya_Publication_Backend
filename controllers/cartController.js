const Cart = require('../models/Cart');
const Book = require('../models/Book');

// GET /api/user/cart
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.book', 'title image price bookType isAvailable');
    if (!cart) return res.json({ success: true, items: [], total: 0 });

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ success: true, items: cart.items, total });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/user/cart
const addToCart = async (req, res) => {
  try {
    const { bookId, bookType } = req.body;

    const book = await Book.findById(bookId);
    if (!book || !book.isAvailable) {
      return res.status(404).json({ success: false, message: 'Book not found or unavailable' });
    }

    // Validate bookType against book
    if (book.bookType !== 'both' && book.bookType !== bookType) {
      return res.status(400).json({ success: false, message: `This book is not available as ${bookType}` });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existingItem = cart.items.find(
      (i) => i.book.toString() === bookId && i.bookType === bookType
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ book: bookId, bookType, quantity: 1, price: book.price });
    }

    await cart.save();
    await cart.populate('items.book', 'title image price bookType');

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ success: true, message: 'Added to cart', items: cart.items, total });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/user/cart/:bookId
const removeFromCart = async (req, res) => {
  try {
    const { bookType } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(
      (i) => !(i.book.toString() === req.params.bookId && i.bookType === bookType)
    );

    await cart.save();
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ success: true, message: 'Item removed', items: cart.items, total });
  } catch (err) {
    console.error('removeFromCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/user/cart
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCart, addToCart, removeFromCart, clearCart };
