const jwt = require('jsonwebtoken');
import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const authAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token and decode it.
    const token: any = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS_ADMIN);

    // Check if it is an admin
    if (decoded.data.roleName !== 'admin') {
      throw new Error();
    }

    // Make the user and the token available in the request object
    req.user = decoded.data;
    req.token = token;

    // Call the next function
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

const authSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token and decode it.
    const token: any = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS_SELLER);

    // Check if it is an admin
    if (decoded.data.roleName !== 'seller') {
      throw new Error();
    }

    // Make the user and the token available in the request object
    req.user = decoded.data;
    req.token = token;

    // Call the next function
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

const authCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token and decode it.
    const token: any = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS_CUSTOMER);

    // Check if it is an admin
    if (decoded.data.roleName !== 'customer') {
      throw new Error();
    }

    // Make the user and the token available in the request object
    req.user = decoded.data;
    req.token = token;

    // Call the next function
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

module.exports = { authAdmin, authSeller, authCustomer };
