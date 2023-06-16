// import express, { NextFunction, Request, Response } from 'express';
// const router = express.Router();

// // IMPORTING ALL THE CONTROLLERS.
// const {
//   createProduct,
//   deleteProduct,
//   seeProduct,
//   seeAllProducts,
//   seeAllMyProducts,
//   updateProduct,
//   uploadImages,
//   deleteImage,
//   adminDeleteProduct,
//   searchProduct,
// } = require('../controllers/productController');

// // Multer
// import multer from 'multer';
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // ADDITIONAL IMPORTS.
// const auth = require('../middlewares/auth');

// // CREATE.
// router.post(
//   '/images/:id',
//   auth,
//   upload.array('images'),
//   uploadImages,
//   (error: any, req: Request, res: Response, next: NextFunction) => {
//     res.status(400).json({ message: error.message });
//   }
// );

// // READ.
// router.get('/', seeAllProducts);
// router.get('/myProducts', auth, seeAllMyProducts);
// router.get('/searchProduct', searchProduct);
// router.get('/:id', seeProduct);

// // UPDATE.
// router.patch('/:id', auth, updateProduct);

// // DELETE.
// router.delete('/deleteImage', auth, deleteImage);
// router.delete('/adminDeleteProduct/:id', auth, adminDeleteProduct);
// router.delete('/:id', auth, deleteProduct);

// module.exports = router;
