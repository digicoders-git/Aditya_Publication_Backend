require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const existing = await Admin.findOne({ email: 'aditya@gmail.com' });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await Admin.create({
      name: 'Super Admin',
      email: 'aditya@gmail.com',
      password: '123456',
    });

    console.log('Admin created successfully!');
    console.log('Email   :', admin.email);
    console.log('Password: 123456');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
};

createAdmin();
