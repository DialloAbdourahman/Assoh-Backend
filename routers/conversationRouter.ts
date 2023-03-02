import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  create,
  myConversations,
  getASpecificConversation,
} = require('../controllers/conversationController');

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/:id', auth, create);

// READ.
router.get('/', auth, myConversations);
router.get('/:id', auth, getASpecificConversation);

// UPDATE.

// DELETE.

module.exports = router;
