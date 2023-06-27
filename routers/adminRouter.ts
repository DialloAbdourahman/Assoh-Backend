import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createAdmin,
  login,
  refreshToken,
  logout,
  avatarUpload,
  deleteAvatar,
  deleteAccount,
  updateAccount,
  searchCustomers,
  searchSellers,
  deleteSeller,
  createSeller,
  searchSeller,
  getProfile,
  searchAdmins,
  deleteCustomer,
  deleteProduct,
  createCategory,
  deleteCategory,
  updateCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} = require('../controllers/adminController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const { authAdmin: auth } = require('../middlewares/auth');

// CREATE.
router.post('/', auth, createAdmin);
router.post('/login', login);
router.post('/token', refreshToken);
router.post('/logout', auth, logout);
router.post('/createSeller', auth, createSeller);
router.post(
  '/avatarUpload',
  auth,
  upload.single('avatar'),
  avatarUpload,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);
router.post('/createCategory', auth, createCategory);
router.post(
  '/uploadCategoryImage/:id',
  auth,
  upload.single('image'),
  uploadCategoryImage,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);

// // READ.
router.get('/profile', auth, getProfile);
router.get('/sellers', searchSellers);
router.get('/seller/:id', searchSeller);
router.get('/customers', auth, searchCustomers);
router.get('/admins', auth, searchAdmins);

// // UPDATE.
router.patch('/', auth, updateAccount);
router.patch('/updateCategory/:id', auth, updateCategory);

// // DELETE.
router.delete('/', auth, deleteAccount);
router.delete('/deleteAvatar', auth, deleteAvatar);
router.delete('/deleteSeller/:id', auth, deleteSeller);
router.delete('/deleteCustomer/:id', auth, deleteCustomer);
router.delete('/deleteProduct/:id', auth, deleteProduct);
router.delete('/deleteCategory/:id', auth, deleteCategory);
router.delete('/deleteCategoryImage/:id', auth, deleteCategoryImage);

module.exports = router;
