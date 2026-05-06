const Razorpay = require('razorpay');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Book = require('../models/Book');
const path = require('path');
const fs = require('fs');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/user/orders/initiate
const initiateOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.book');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate all books still available
    for (const item of cart.items) {
      if (!item.book || !item.book.isAvailable) {
        return res.status(400).json({ success: false, message: `Book "${item.book?.title}" is no longer available` });
      }
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check if hardbook in cart — shippingAddress required
    const hasHardbook = cart.items.some((i) => i.bookType === 'hardbook');
    if (hasHardbook) {
      if (!shippingAddress || !shippingAddress.address || !shippingAddress.city ||
          !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.mobile) {
        return res.status(400).json({ success: false, message: 'Shipping address required for hardbook orders' });
      }
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `receipt_${req.user._id}_${Date.now()}`,
    });

    // Save pending order in DB
    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map((i) => ({
        book: i.book._id,
        quantity: i.quantity,
        price: i.price,
        bookType: i.bookType,
      })),
      totalAmount,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      shippingAddress: hasHardbook ? shippingAddress : undefined,
      razorpayOrderId: razorpayOrder.id,
    });

    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('initiateOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/user/orders/verify
const verifyPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update order — ensure it belongs to this user
    const order = await Order.findOneAndUpdate(
      { _id: orderId, user: req.user._id },
      { paymentStatus: 'paid', orderStatus: 'processing', paymentId: razorpayPaymentId },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    res.json({ success: true, message: 'Payment successful', order });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/user/orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.book', 'title image bookType')
      .sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/user/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.book', 'title image bookType author');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/user/orders/:id/cancel
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: `Order cannot be cancelled at ${order.orderStatus} stage` });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/user/orders/:id/download/:bookId
const downloadPdf = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
      paymentStatus: 'paid',
    }).populate('items.book');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not paid' });

    const item = order.items.find(
      (i) => i.book._id.toString() === req.params.bookId && i.bookType === 'pdf'
    );

    if (!item) return res.status(403).json({ success: false, message: 'PDF not purchased in this order' });

    const pdfPath = path.join(__dirname, '..', item.book.pdfUrl);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: 'PDF file not found' });
    }

    res.download(pdfPath, `${item.book.title}.pdf`);
  } catch (err) {
    console.error('downloadPdf error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin payments
const getPayments = async (req, res) => {
  try {
    const payments = await Order.find({ paymentStatus: 'paid' })
      .populate('user', 'name email')
      .populate('items.book', 'title')
      .sort('-createdAt');

    const total = payments.reduce((sum, o) => sum + o.totalAmount, 0);
    res.json({ success: true, total, payments });
  } catch (err) {
    console.error('getPayments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin sales report
const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { paymentStatus: 'paid' };

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const monthlySales = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    const overall = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      overall: overall[0] || { totalSales: 0, totalOrders: 0 },
      monthlySales,
    });
  } catch (err) {
    console.error('getSalesReport error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { initiateOrder, verifyPayment, getMyOrders, getOrderById, cancelOrder, downloadPdf, getPayments, getSalesReport };
