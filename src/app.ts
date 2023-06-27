import express from 'express';
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Routers import.
const productRouter = require('../routers/productRouter');
const categoryRouter = require('../routers/categoryRouter');
// const productReviewRouter = require('../routers/productReviewRouter');
// const sellerReportRouter = require('../routers/sellerReportRouter');
// const orderRouter = require('../routers/orderRouter');
// const conversationRouter = require('../routers/conversationRouter');
// const messageRouter = require('../routers/messageRouter');
const adminRouter = require('../routers/adminRouter');
const sellerRouter = require('../routers/sellerRouter');
const customerRouter = require('../routers/customerRouter');

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

// Middleware for cookies
app.use(cookieParser());

// Routes to routers mapping.
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
// app.use('/api/productReviews', productReviewRouter);
// app.use('/api/sellerReports', sellerReportRouter);
// app.use('/api/orders', orderRouter);
// app.use('/api/conversations', conversationRouter);
// app.use('/api/messages', messageRouter);
app.use('/api/admin', adminRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/customer', customerRouter);

// Export the app.
module.exports = app;
