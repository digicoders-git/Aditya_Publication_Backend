const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Book = require('../models/Book');
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/admin/login
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(admin._id);

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        profilePic: admin.profilePic,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/me
const getMe = async (req, res) => {
  const admin = req.admin;
  res.json({
    success: true,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      profilePic: admin.profilePic,
    },
  });
};

// PUT /api/admin/profile
const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const admin = req.admin;
    const { name, mobile } = req.body;

    if (name) admin.name = name;
    if (mobile !== undefined) admin.mobile = mobile;

    if (req.file) {
      // Delete old pic if exists
      if (admin.profilePic && !admin.profilePic.startsWith('http')) {
        const oldPath = path.join(__dirname, '..', admin.profilePic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      // Upload to Cloudinary as well as keeping the local file
      const cloudUrl = await uploadToCloudinary(req.file.path);
      if (cloudUrl) {
        admin.profilePic = cloudUrl;
      } else {
        admin.profilePic = `uploads/${req.file.filename}`;
      }
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        profilePic: admin.profilePic,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.json({ success: true, users });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/users/:id/status
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({
      success: true,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: { id: user._id, name: user.name, email: user.email, isBlocked: user.isBlocked },
    });
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalPDFs = await Book.countDocuments({ bookType: 'pdf' });
    const totalHardBooks = await Book.countDocuments({ bookType: 'hardbook' });
    const totalOrders = await Order.countDocuments();
    
    const salesData = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPDFs,
        totalHardBooks,
        totalOrders,
        totalSales: salesData.length > 0 ? salesData[0].totalSales : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/change-password
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select('+password');
    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid old password' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login, getMe, updateProfile, getUsers, toggleUserStatus, getDashboardStats, changePassword };



