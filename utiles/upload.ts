import { Request } from 'express';

const multer = require('multer');

const uploadAvatar = multer({
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req: Request, file: any, callback: Function) {
    if (
      !file.originalname.endsWith('.jpg') &&
      !file.originalname.endsWith('.png') &&
      !file.originalname.endsWith('.jpeg')
    ) {
      callback(new Error('Please upload a .jpg, .jpeg or a .png image'));
    }
    callback(undefined, true);
  },
  storage: multer.diskStorage({
    destination: function (req: Request, file: any, cb: Function) {
      cb(null, './uploads/avatars'); // This is the only place we need to change the destination.
    },
    filename: function (req: Request, file: any, cb: Function) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    },
  }),
});

const uploadProductImages = multer({
  limits: {
    fileSize: 1000000,
    files: 5,
  },
  fileFilter(req: Request, file: any, callback: Function) {
    if (
      !file.originalname.endsWith('.jpg') &&
      !file.originalname.endsWith('.png') &&
      !file.originalname.endsWith('.jpeg')
    ) {
      callback(new Error('Please upload a .jpg, .jpeg or a .png image'));
    }
    callback(undefined, true);
  },
  storage: multer.diskStorage({
    destination: function (req: Request, file: any, cb: Function) {
      cb(null, './uploads/products'); // This is the only place we need to change the destination.
    },
    filename: function (req: Request, file: any, cb: Function) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    },
  }),
});

module.exports = { uploadAvatar, uploadProductImages };
