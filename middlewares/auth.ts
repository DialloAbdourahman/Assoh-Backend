const jwt = require('jsonwebtoken');
import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token and decode it.
    const token: any = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in the database using the id encoded in the token
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        tokens: {
          hasEvery: [token],
        },
      },
      include: {
        sellerInfo: {
          include: {
            myProducts: true,
            recievedReports: true,
          },
        },
      },
    });

    // Check if user was found
    if (!user) {
      throw new Error();
    }

    // Make the user and the token available in the request object
    req.user = user;
    req.token = token;

    // Call the next function
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

module.exports = auth;
