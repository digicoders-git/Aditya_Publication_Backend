const Book = require('../models/Book');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

// POST /api/admin/books
const createBook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, author, category, price, oldPrice, description, pages, language, bookType, badge, discount, isRecommended, isSpecialOffer, isFeatured, isTopBook } = req.body;

    let imageUrl = null;
    let pdfUrl = null;

    if (req.files) {
      if (req.files.image) {
        const cloudUrl = await uploadToCloudinary(req.files.image[0].path);
        imageUrl = cloudUrl || `uploads/${req.files.image[0].filename}`;
      }
      if (req.files.pdf) pdfUrl = `uploads/${req.files.pdf[0].filename}`;
    }

    const book = await Book.create({
      title, author, category, price, oldPrice, description, pages, language, bookType, badge, discount,
      image: imageUrl,
      pdfUrl,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      isRecommended: isRecommended === 'true' || isRecommended === true,
      isSpecialOffer: isSpecialOffer === 'true' || isSpecialOffer === true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isTopBook: isTopBook === 'true' || isTopBook === true,
    });

    const obj = book.toObject();
    if (obj.image && !obj.image.startsWith('http')) {
      obj.image = `${req.protocol}://${req.get('host')}/${obj.image}`;
    }

    res.status(201).json({ success: true, message: 'Book created successfully', book: obj });
  } catch (err) {
    console.error('createBook error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/books (Admin view)
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort('-createdAt');
    const protocol = req.protocol;
    const host = req.get('host');
    const booksWithUrl = books.map(b => {
      const obj = b.toObject();
      if (obj.image && !obj.image.startsWith('http')) {
        obj.image = `${protocol}://${host}/${obj.image}`;
      }
      return obj;
    });
    res.json({ success: true, books: booksWithUrl });
  } catch (err) {
    console.error('getAllBooks error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// PUT /api/admin/books/:id
const updateBook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    const updates = { ...req.body };
    // Ensure boolean conversion for section flags coming from FormData
    ['isAvailable', 'isRecommended', 'isSpecialOffer', 'isFeatured', 'isTopBook'].forEach(key => {
      if (updates[key] !== undefined) updates[key] = updates[key] === 'true' || updates[key] === true;
    });

    if (req.files) {
      if (req.files.image) {
        if (book.image && !book.image.startsWith('http') && fs.existsSync(path.join(__dirname, '..', book.image))) {
          fs.unlinkSync(path.join(__dirname, '..', book.image));
        }
        const cloudUrl = await uploadToCloudinary(req.files.image[0].path);
        updates.image = cloudUrl || `uploads/${req.files.image[0].filename}`;
      }
      if (req.files.pdf) {
        if (book.pdfUrl && fs.existsSync(path.join(__dirname, '..', book.pdfUrl))) {
          fs.unlinkSync(path.join(__dirname, '..', book.pdfUrl));
        }
        updates.pdfUrl = `uploads/${req.files.pdf[0].filename}`;
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    const obj = updatedBook.toObject();
    if (obj.image && !obj.image.startsWith('http')) {
      obj.image = `${req.protocol}://${req.get('host')}/${obj.image}`;
    }
    res.json({ success: true, message: 'Book updated successfully', book: obj });
  } catch (err) {
    console.error('updateBook error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/books/:id
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (book.image && fs.existsSync(path.join(__dirname, '..', book.image))) {
      fs.unlinkSync(path.join(__dirname, '..', book.image));
    }
    if (book.pdfUrl && fs.existsSync(path.join(__dirname, '..', book.pdfUrl))) {
      fs.unlinkSync(path.join(__dirname, '..', book.pdfUrl));
    }

    await book.deleteOne();
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    console.error('deleteBook error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { createBook, getAllBooks, updateBook, deleteBook };
