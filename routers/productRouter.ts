import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createProduct,
  deleteProduct,
  seeProduct,
  seeAllProducts,
  seeAllMyProducts,
  updateProduct,
  uploadImages,
  deleteImage,
  adminDeleteProduct,
} = require('../controllers/productController');

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');
const { uploadProductImages } = require('../utiles/upload');

// CREATE.
router.post('/', auth, createProduct);
router.post(
  '/images/:id',
  auth,
  uploadProductImages.array('images'),
  uploadImages,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);

// READ.
router.get('/', seeAllProducts);
router.get('/myProducts', auth, seeAllMyProducts);
router.get('/:id', seeProduct);

// UPDATE.
router.patch('/:id', auth, updateProduct);

// DELETE.
router.delete('/deleteImage', auth, deleteImage);
router.delete('/adminDeleteProduct/:id', auth, adminDeleteProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
