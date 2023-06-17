// import express, { Request, Response, NextFunction } from 'express';
// const router = express.Router();

// // IMPORTING ALL THE CONTROLLERS.
// const {
//   createCategory,
//   deleteCategory,
//   seeCategories,
//   updateCategory,
//   uploadCategoryImage,
//   deleteCategoryImage,
// } = require('../controllers/categoryController');

// // Multer
// import multer from 'multer';
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // ADDITIONAL IMPORTS.
// const auth = require('../middlewares/auth');

// // CREATE.
// router.post(
//   '/uploadImage/:id',
//   auth,
//   upload.single('image'),
//   uploadCategoryImage,
//   (error: any, req: Request, res: Response, next: NextFunction) => {
//     res.status(400).json({ message: error.message });
//   }
// );

// // READ.
// router.get('/', seeCategories);

// // UPDATE.
// router.patch('/:id', auth, updateCategory);

// // DELETE.
// router.delete('/deleteImage/:id', auth, deleteCategoryImage);
// router.delete('/:id', auth, deleteCategory);

// module.exports = router;
