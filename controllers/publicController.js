const Book = require('../models/Book');

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/${imagePath}`;
};

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

    const booksWithFullUrl = books.map(b => {
      const obj = b.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });

    res.json({ success: true, count: booksWithFullUrl.length, books: booksWithFullUrl });
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
    const obj = book.toObject();
    obj.image = buildImageUrl(req, obj.image);
    res.json({ success: true, book: obj });
  } catch (err) {
    console.error('getBookById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/books/section/recommended
const getSectionBooks = (flagField) => async (req, res) => {
  try {
    const books = await Book.find({ isAvailable: true, [flagField]: true })
      .select('-pdfUrl')
      .sort({ createdAt: -1 });
    const booksWithFullUrl = books.map(b => {
      const obj = b.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });
    res.json({ success: true, count: booksWithFullUrl.length, books: booksWithFullUrl });
  } catch (err) {
    console.error(`getSectionBooks(${flagField}) error:`, err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/books/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Book.distinct('category', { isAvailable: true });
    const sortedCategories = categories.filter(Boolean).sort((a, b) => a.localeCompare(b));
    res.json({ success: true, categories: sortedCategories });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getBooks, getBookById, getSectionBooks, getCategories };
