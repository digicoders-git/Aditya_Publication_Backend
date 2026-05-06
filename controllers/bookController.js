const Book = require('../models/Book');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// POST /api/admin/books
const createBook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, author, category, price, oldPrice, description, pages, language, bookType, badge, discount } = req.body;

    let imageUrl = null;
    let pdfUrl = null;

    if (req.files) {
      if (req.files.image) imageUrl = `uploads/${req.files.image[0].filename}`;
      if (req.files.pdf) pdfUrl = `uploads/${req.files.pdf[0].filename}`;
    }

    const book = await Book.create({
      title, author, category, price, oldPrice, description, pages, language, bookType, badge, discount,
      image: imageUrl,
      pdfUrl,
    });

    res.status(201).json({ success: true, message: 'Book created successfully', book });
  } catch (err) {
    console.error('createBook error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/books (Admin view)
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort('-createdAt');
    res.json({ success: true, books });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
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

    const updates = req.body;

    if (req.files) {
      if (req.files.image) {
        if (book.image && fs.existsSync(path.join(__dirname, '..', book.image))) {
          fs.unlinkSync(path.join(__dirname, '..', book.image));
        }
        updates.image = `uploads/${req.files.image[0].filename}`;
      }
      if (req.files.pdf) {
        if (book.pdfUrl && fs.existsSync(path.join(__dirname, '..', book.pdfUrl))) {
          fs.unlinkSync(path.join(__dirname, '..', book.pdfUrl));
        }
        updates.pdfUrl = `uploads/${req.files.pdf[0].filename}`;
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Book updated successfully', book: updatedBook });
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createBook, getAllBooks, updateBook, deleteBook };
