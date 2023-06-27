import express from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const { seeCategories } = require('../controllers/categoryController');

// READ.
router.get('/', seeCategories);

module.exports = router;
