const express = require('express');
const { getBooks, getBookById } = require('../controllers/publicController');
const { getActiveOffers } = require('../controllers/offerController');

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getBookById);

module.exports = router;
