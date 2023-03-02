import express from 'express';
const cors = require('cors');

// Routers import.
const userRouter = require('../routers/userRouter');
const productRouter = require('../routers/productRouter');
const categoryRouter = require('../routers/categoryRouter');
const productReviewRouter = require('../routers/productReviewRouter');
const sellerReportRouter = require('../routers/sellerReportRouter');
const orderRouter = require('../routers/orderRouter');
const conversationRouter = require('../routers/conversationRouter');
const messageRouter = require('../routers/messageRouter');

// Initialization of an express app.
const app = express();

// Cors setting.
app.use(cors());

// Adding user and token on the request object.
declare global {
  namespace Express {
    interface Request {
      user: any;
      token: string;
    }
  }
}

// Making the upload directory publicly accessible.
app.use('/uploads', express.static('uploads'));

// Json setting.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes to routers mapping.
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/productReviews', productReviewRouter);
app.use('/api/sellerReports', sellerReportRouter);
app.use('/api/orders', orderRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/messages', messageRouter);

// Export the app.
module.exports = app;
