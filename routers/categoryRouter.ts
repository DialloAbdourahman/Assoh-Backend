import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  createCategory,
  deleteCategory,
  seeCategories,
  updateCategory,
  seeCategory,
} = require('../controllers/categoryController');

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/', auth, createCategory);

// READ.
router.get('/', seeCategories);
router.get('/:id', seeCategory);

// UPDATE.
router.patch('/:id', auth, updateCategory);

// DELETE.
router.delete('/:id', auth, deleteCategory);

module.exports = router;
