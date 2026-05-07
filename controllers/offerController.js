const Offer = require('../models/Offer');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${req.protocol}://${req.get('host')}/${imagePath}`;
};

// GET /api/offers  (public)
const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).sort('-createdAt');
    const result = offers.map(o => {
      const obj = o.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });
    res.json({ success: true, offers: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/offers  (admin - all)
const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort('-createdAt');
    const result = offers.map(o => {
      const obj = o.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });
    res.json({ success: true, offers: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/admin/offers
const createOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { title, description, price, oldPrice, discountPercent, categories, isActive } = req.body;

    let imageUrl = null;
    if (req.file) {
      const cloudUrl = await uploadToCloudinary(req.file.path);
      imageUrl = cloudUrl || `uploads/${req.file.filename}`;
    }

    const parsedCategories = categories
      ? (Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim()).filter(Boolean))
      : [];

    const offer = await Offer.create({
      title,
      description,
      price,
      oldPrice: oldPrice || null,
      discountPercent: discountPercent || 0,
      categories: parsedCategories,
      image: imageUrl,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
    });

    const obj = offer.toObject();
    obj.image = buildImageUrl(req, obj.image);
    res.status(201).json({ success: true, message: 'Offer created successfully', offer: obj });
  } catch (err) {
    console.error('createOffer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/offers/:id
const updateOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    const updates = { ...req.body };

    if (updates.categories) {
      updates.categories = Array.isArray(updates.categories)
        ? updates.categories
        : updates.categories.split(',').map(c => c.trim()).filter(Boolean);
    }

    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === 'true' || updates.isActive === true;
    }

    if (req.file) {
      if (offer.image && !offer.image.startsWith('http')) {
        const oldPath = path.join(__dirname, '..', offer.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const cloudUrl = await uploadToCloudinary(req.file.path);
      updates.image = cloudUrl || `uploads/${req.file.filename}`;
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    const obj = updated.toObject();
    obj.image = buildImageUrl(req, obj.image);
    res.json({ success: true, message: 'Offer updated successfully', offer: obj });
  } catch (err) {
    console.error('updateOffer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/offers/:id/toggle
const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    offer.isActive = !offer.isActive;
    await offer.save();
    res.json({ success: true, message: `Offer ${offer.isActive ? 'activated' : 'deactivated'}`, isActive: offer.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/offers/:id
const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.image && !offer.image.startsWith('http')) {
      const imgPath = path.join(__dirname, '..', offer.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await offer.deleteOne();
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getActiveOffers, getAllOffers, createOffer, updateOffer, toggleOfferStatus, deleteOffer };
