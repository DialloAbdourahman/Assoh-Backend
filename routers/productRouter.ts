import express from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  seeProduct,
  seeAllProducts,
  searchProduct,
} = require('../controllers/productController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.

// READ.
router.get('/', seeAllProducts);
router.get('/searchProduct', searchProduct);
router.get('/:id', seeProduct);

// UPDATE.

// DELETE.

module.exports = router;
