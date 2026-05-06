const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const id = req.admin?._id || req.user?._id || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `upload_${id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|webp|pdf/;
  const allowedMimes = /image\/jpeg|image\/jpg|image\/png|image\/webp|application\/pdf/;
  const isExtValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = allowedMimes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (jpeg, jpg, png, webp) and PDFs allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
});

module.exports = upload;
