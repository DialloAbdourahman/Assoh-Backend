import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const {
  create,
  seeAllMessagesOfAConversation,
} = require('../controllers/messageController');

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/', auth, create);

// READ.
router.get('/:id', auth, seeAllMessagesOfAConversation);

// UPDATE.

// DELETE.

module.exports = router;
