const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/user/register
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, mobile } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, mobile });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/user/login
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, profilePic: user.profilePic },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/user/me
const getMe = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, profilePic: user.profilePic },
  });
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const user = req.user;
    const { name, mobile } = req.body;

    if (name) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;

    if (req.file) {
      if (user.profilePic && !user.profilePic.startsWith('http')) {
        const oldPath = path.join(__dirname, '..', user.profilePic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      // Upload to Cloudinary as well as keeping local copy
      const cloudUrl = await uploadToCloudinary(req.file.path);
      if (cloudUrl) {
        user.profilePic = cloudUrl;
      } else {
        user.profilePic = `uploads/${req.file.filename}`;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, profilePic: user.profilePic },
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/user/change-password
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user._id).select('+password');
    const { oldPassword, newPassword } = req.body;

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
