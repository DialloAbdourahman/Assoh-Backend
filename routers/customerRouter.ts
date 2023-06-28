import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createAccount,
  login,
  refreshToken,
  logout,
  avatarUpload,
  deleteAvatar,
  deleteAccount,
  updateAccount,
  getProfile,
  reportSeller,
  deleteReport,
  updateSellerReport,
} = require('../controllers/customerController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const { authCustomer: auth } = require('../middlewares/auth');

// CREATE.
router.post('/', createAccount);
router.post('/login', login);
router.post('/token', refreshToken);
router.post('/logout', auth, logout);
router.post(
  '/avatarUpload',
  auth,
  upload.single('avatar'),
  avatarUpload,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);
router.post('/reportSeller', auth, reportSeller);

// READ.
router.get('/profile', auth, getProfile);

// UPDATE.
router.patch('/', auth, updateAccount);
router.patch('/updateSellerReport/:id', auth, updateSellerReport);

// DELETE.
router.delete('/', auth, deleteAccount);
router.delete('/deleteAvatar', auth, deleteAvatar);
router.delete('/deleteSellerReport/:id', auth, deleteReport);

module.exports = router;
