import express from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  seeProduct,
  seeAllProducts,
  searchProduct,
} = require('../controllers/productController');

// READ.
router.get('/', seeAllProducts);
router.get('/searchProduct', searchProduct);
router.get('/:id', seeProduct);

module.exports = router;
