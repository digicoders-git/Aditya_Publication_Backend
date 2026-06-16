const express = require('express');
const { getBooks, getBookById, getSectionBooks, getCategories } = require('../controllers/publicController');
const { getActiveOffers } = require('../controllers/offerController');
const { getPublishedNews } = require('../controllers/newsController');

const router = express.Router();

router.get('/', getBooks);

// Section routes — must come BEFORE /:id
router.get('/section/recommended',   getSectionBooks('isRecommended'));
router.get('/section/special-offers', getSectionBooks('isSpecialOffer'));
router.get('/section/featured',       getSectionBooks('isFeatured'));
router.get('/section/top-books',      getSectionBooks('isTopBook'));

router.get('/categories', getCategories);
router.get('/:id', getBookById);

module.exports = router;
