const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.book', 'title')
      .sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/orders/hardbooks
const getHardBookOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 'items.bookType': 'hardbook' })
      .populate('user', 'name email')
      .populate('items.book', 'title')
      .sort('-createdAt');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = status;
    await order.save();

    res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllOrders, getHardBookOrders, updateOrderStatus };

