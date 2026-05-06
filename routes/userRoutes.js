const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/userController');
const { getCart, addToCart, removeFromCart, clearCart } = require('../controllers/cartController');
const { initiateOrder, verifyPayment, getMyOrders, getOrderById, cancelOrder, downloadPdf } = require('../controllers/orderUserController');
const { userProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, try again after 15 minutes' },
});

// ─── Auth ────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').optional().isMobilePhone().withMessage('Invalid mobile number'),
], register);

router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

// ─── Profile ─────────────────────────────────────────────
router.get('/me', userProtect, getMe);

router.put('/profile', userProtect, upload.single('profilePic'), [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('mobile').optional().isMobilePhone().withMessage('Invalid mobile number'),
], updateProfile);

router.patch('/change-password', userProtect, [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], changePassword);

// ─── Cart ─────────────────────────────────────────────────
router.get('/cart', userProtect, getCart);

router.post('/cart', userProtect, [
  body('bookId').notEmpty().withMessage('Book ID is required'),
  body('bookType').isIn(['pdf', 'hardbook']).withMessage('bookType must be pdf or hardbook'),
], addToCart);

router.delete('/cart/:bookId', userProtect, [
  body('bookType').isIn(['pdf', 'hardbook']).withMessage('bookType must be pdf or hardbook'),
], removeFromCart);

router.delete('/cart', userProtect, clearCart);

// ─── Orders ───────────────────────────────────────────────
router.post('/orders/initiate', userProtect, [
  body('shippingAddress').optional().isObject().withMessage('shippingAddress must be an object'),
  body('shippingAddress.address').optional().notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').optional().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').optional().notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').optional().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required'),
  body('shippingAddress.mobile').optional().isMobilePhone().withMessage('Valid mobile required'),
], initiateOrder);

router.post('/orders/verify', userProtect, [
  body('razorpayOrderId').notEmpty().withMessage('razorpayOrderId is required'),
  body('razorpayPaymentId').notEmpty().withMessage('razorpayPaymentId is required'),
  body('razorpaySignature').notEmpty().withMessage('razorpaySignature is required'),
  body('orderId').notEmpty().withMessage('orderId is required'),
], verifyPayment);

router.get('/orders', userProtect, getMyOrders);
router.get('/orders/:id', userProtect, getOrderById);
router.post('/orders/:id/cancel', userProtect, cancelOrder);
router.get('/orders/:id/download/:bookId', userProtect, downloadPdf);

module.exports = router;
