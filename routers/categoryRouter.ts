import express from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createCategory,
  deleteCategory,
  seeCategories,
  updateCategory,
  seeCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} = require('../controllers/categoryController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/', auth, createCategory);
router.post(
  '/uploadImage/:id',
  auth,
  upload.single('image'),
  uploadCategoryImage
);

// READ.
router.get('/', seeCategories);
router.get('/:id', seeCategory);

// UPDATE.
router.patch('/:id', auth, updateCategory);

// DELETE.
router.delete('/deleteImage/:id', auth, deleteCategoryImage);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
