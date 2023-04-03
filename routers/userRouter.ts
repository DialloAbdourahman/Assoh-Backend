import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createUser,
  login,
  logout,
  avatarUpload,
  deleteAvatar,
  deleteUser,
  updateUser,
  adminSearchUsers,
  searchSellers,
  adminDelete,
  adminTransform,
  searchSeller,
  sellerUpdate,
} = require('../controllers/userController');

// Multer
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/', createUser);
router.post('/login', login);
router.post('/logout', auth, logout);
router.post('/adminTransform/:id', auth, adminTransform);
router.post(
  '/avatarUpload',
  auth,
  upload.single('avatar'),
  avatarUpload,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(400).json({ message: error.message });
  }
);

// READ.
router.get('/sellers', searchSellers);
router.get('/:id', searchSeller);
router.get('/', auth, adminSearchUsers);

// UPDATE.
router.patch('/sellerUpdate', auth, sellerUpdate);
router.patch('/', auth, updateUser);

// DELETE.
router.delete('/', auth, deleteUser);
router.delete('/deleteAvatar', auth, deleteAvatar);
router.delete('/adminDelete/:id', auth, adminDelete);

module.exports = router;
