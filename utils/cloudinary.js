const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dy7p8f0qd',
  api_key: process.env.CLOUDINARY_API_KEY || '697735142411785',
  api_secret: process.env.CLOUDINARY_API_SECRET || 't6rLQ-zbvt1rqaUEtOh3ex4b_-Q'
});

const uploadToCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'bookinform'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
};

module.exports = { uploadToCloudinary };
