const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { login, getMe, updateProfile, getUsers, toggleUserStatus, getDashboardStats, changePassword } = require('../controllers/adminController');



const { createBook, getAllBooks, updateBook, deleteBook } = require('../controllers/bookController');
const { getPayments, getSalesReport } = require('../controllers/orderUserController');
const { getAllOrders, getHardBookOrders, updateOrderStatus } = require('../controllers/orderController');
const { getAllOffers, createOffer, updateOffer, toggleOfferStatus, deleteOffer } = require('../controllers/offerController');


const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Login - strict rate limit
router.post('/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, try again after 15 minutes' },
}), [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

// Get logged-in admin
router.get('/me', protect, getMe);

// Dashboard
router.get('/dashboard/stats', protect, getDashboardStats);

// Payments & Reports
router.get('/payments', protect, getPayments);
router.get('/reports/sales', protect, getSalesReport);

// Update profile
router.put('/profile', protect, upload.single('profilePic'), [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('mobile').optional().isMobilePhone().withMessage('Invalid mobile number'),
], updateProfile);

// Change Password
router.patch('/change-password', protect, [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], changePassword);

// User Management

router.get('/users', protect, getUsers);
router.patch('/users/:id/status', protect, toggleUserStatus);

// Book Management
router.post('/books', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
], createBook);

router.get('/books', protect, getAllBooks);

// Update Book
router.put('/books/:id', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().trim().notEmpty().withMessage('Author cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('bookType').optional().isIn(['pdf', 'hardbook', 'both']).withMessage('Invalid book type'),
  body('discount').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be 0-100'),
], updateBook);

router.delete('/books/:id', protect, deleteBook);

// Offer Management
router.get('/offers', protect, getAllOffers);
router.post('/offers', protect, upload.single('image'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
], createOffer);
router.put('/offers/:id', protect, upload.single('image'), [
  body('title').optional().trim().notEmpty(),
  body('price').optional().isNumeric(),
], updateOffer);
router.patch('/offers/:id/toggle', protect, toggleOfferStatus);
router.delete('/offers/:id', protect, deleteOffer);

// Order Management
router.get('/orders', protect, getAllOrders);
router.get('/orders/hardbooks', protect, getHardBookOrders);
// Update Order Status
router.patch('/orders/:id/status', protect, [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
], updateOrderStatus);

module.exports = router;



