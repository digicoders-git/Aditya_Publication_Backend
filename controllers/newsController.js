const News = require('../models/News');

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${req.protocol}://${req.get('host')}/${imagePath}`;
};

// ── Admin: Get all news ──────────────────────────────────────────────────────
const getAllNews = async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    const mapped = news.map(n => {
      const obj = n.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });
    res.json({ success: true, count: mapped.length, news: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Create news ───────────────────────────────────────────────────────
const createNews = async (req, res) => {
  try {
    const { title, excerpt, author, isPublished } = req.body;
    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.path.replace(/\\/g, '/');
    }
    const news = await News.create({
      title,
      excerpt,
      author: author || 'Admin',
      image: imageUrl,
      isPublished: isPublished === 'true' || isPublished === true,
    });
    const obj = news.toObject();
    obj.image = buildImageUrl(req, obj.image);
    res.status(201).json({ success: true, message: 'News article created!', news: obj });
  } catch (err) {
    console.error('createNews error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Update news ───────────────────────────────────────────────────────
const updateNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    const updates = { ...req.body };
    if (updates.isPublished !== undefined) {
      updates.isPublished = updates.isPublished === 'true' || updates.isPublished === true;
    }
    if (req.file) {
      updates.image = req.file.path.replace(/\\/g, '/');
    }

    Object.assign(news, updates);
    await news.save();

    const obj = news.toObject();
    obj.image = buildImageUrl(req, obj.image);
    res.json({ success: true, message: 'News updated!', news: obj });
  } catch (err) {
    console.error('updateNews error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Toggle published status ──────────────────────────────────────────
const toggleNewsStatus = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    news.isPublished = !news.isPublished;
    await news.save();
    res.json({ success: true, message: `News ${news.isPublished ? 'published' : 'unpublished'}!`, isPublished: news.isPublished });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Delete news ───────────────────────────────────────────────────────
const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.json({ success: true, message: 'News article deleted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Public: Get published news ───────────────────────────────────────────────
const getPublishedNews = async (req, res) => {
  try {
    const news = await News.find({ isPublished: true }).sort({ createdAt: -1 }).limit(8);
    const mapped = news.map(n => {
      const obj = n.toObject();
      obj.image = buildImageUrl(req, obj.image);
      return obj;
    });
    res.json({ success: true, count: mapped.length, news: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllNews, createNews, updateNews, toggleNewsStatus, deleteNews, getPublishedNews };
