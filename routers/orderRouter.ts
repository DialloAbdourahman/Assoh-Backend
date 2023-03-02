import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

// IMPORTING ALL THE CONTROLLERS.
const { createOrder } = require('../controllers/orderController');

// ADDITIONAL IMPORTS.
const auth = require('../middlewares/auth');

// CREATE.
router.post('/', auth, createOrder);

// READ.

// UPDATE.

// DELETE.

module.exports = router;
