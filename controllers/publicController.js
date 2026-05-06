const Book = require('../models/Book');

// GET /api/books
const getBooks = async (req, res) => {
  try {
    const { search, category, bookType, minPrice, maxPrice, sort } = req.query;

    const filter = { isAvailable: true };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (bookType) filter.bookType = bookType;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };

    const books = await Book.find(filter)
      .select('-pdfUrl')
      .sort(sortOptions[sort] || { createdAt: -1 });

    res.json({ success: true, count: books.length, books });
  } catch (err) {
    console.error('getBooks error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/books/:id
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select('-pdfUrl');
    if (!book || !book.isAvailable) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    res.json({ success: true, book });
  } catch (err) {
    console.error('getBookById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getBooks, getBookById };
