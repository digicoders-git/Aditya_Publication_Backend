const Contact = require('../models/Contact');

// @desc    Submit a contact form message
// @route   POST /api/contact
// @access  Public
exports.submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields (Name, Email, and Message).' 
      });
    }

    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      message
    });

    res.status(201).json({ 
      success: true, 
      message: 'Your message has been received successfully! We will get back to you soon.', 
      data: contact 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to submit message. Please try again later.' 
    });
  }
};

// @desc    Get all contact messages
// @route   GET /api/admin/contacts
// @access  Private (Admin only)
exports.getContactMessages = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      count: contacts.length, 
      contacts 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch contact messages.' 
    });
  }
};

// @desc    Delete a contact message
// @route   DELETE /api/admin/contacts/:id
// @access  Private (Admin only)
exports.deleteContactMessage = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact message not found.' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Message deleted successfully.' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete message.' 
    });
  }
};
