import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  login,
  refreshToken,
  logout,
  avatarUpload,
  deleteAvatar,
  deleteAccount,
  updateAccount,
  getProfile,
  createProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  updateProduct,
  seeAllMyProducts,
  myConversations,
  sendMessage,
  seeSeller,
  getStatistics,
} = require('../controllers/sellerController');

const {
  seeAllMessagesOfAConversation,
} = require('../controllers/customerController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const { authSeller: auth } = require('../middlewares/auth');

// CREATE.
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
router.post('/createProduct', auth, createProduct);
router.post(
  '/uploadProductImages/:id',
  auth,
  upload.array('images'),
  uploadProductImages,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);
router.post('/sendMessage', auth, sendMessage);

// READ.
router.get('/profile', auth, getProfile);
router.get('/seeSeller/:id', seeSeller);
router.get('/myProducts', auth, seeAllMyProducts);
router.get('/myConversations', auth, myConversations);
router.get(
  '/seeAllMessagesOfAConversation/:conversationId',
  auth,
  seeAllMessagesOfAConversation
);
router.get('/statistics', auth, getStatistics);

// UPDATE.
router.patch('/', auth, updateAccount);
router.patch('/updateProduct/:id', auth, updateProduct);

// DELETE.
router.delete('/', auth, deleteAccount);
router.delete('/deleteAvatar', auth, deleteAvatar);
router.delete('/deleteProduct/:id', auth, deleteProduct);
router.delete('/deleteProductImage', auth, deleteProductImage);

module.exports = router;
