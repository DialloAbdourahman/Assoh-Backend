import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const createReview = async (req: Request, res: Response) => {
  try {
    // Should not allow an admin to post a review
    if (req.user.roleName === 'admin') {
      res.status(400).send({ message: 'This route is not for admins.' });
      return;
    }

    // Getting the required information from the request body.
    const { rating, comment, productId } = req.body;

    // Check if the rating is max five.
    if (rating > 5) {
      return res.status(400).json({ message: 'Rating must be less than 5.' });
    }

    // Maybe check if the customer already reviewed the product. If so overide the review or tell them it is impossible to review twice

    // Storing the review in the database.
    const productReview = await prisma.productReview.create({
      data: {
        userId: req.user.id,
        productId,
        rating,
        comment,
      },
    });

    // Send the review back to the user.
    res
      .status(201)
      .json({ message: 'Review has been created.', productReview });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteReview = async (req: Request, res: Response) => {
  try {
    // Check if the user is an admin.
    if (req.user.roleName === 'admin') {
      return res
        .status(400)
        .json({ message: 'Sorry, this route is not for admins.' });
    }

    // Get the id of the review.
    const { id } = req.params;

    // Get the review.
    const review = await prisma.productReview.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    // Check if the review exist.
    if (!review) {
      return res
        .status(400)
        .json({ message: 'You are not allowed to delete this review.' });
    }

    // Delete the review from db.
    await prisma.productReview.delete({
      where: {
        id,
      },
    });

    // Send a positive response back to the user
    res.status(200).json({ message: 'Review has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const adminDelete = async (req: Request, res: Response) => {
  try {
    // Check if the user is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).json({ message: 'Sorry, you are not an admin.' });
    }

    // Get the id of the review.
    const { id } = req.params;

    // Delete the review from db.
    await prisma.productReview.delete({
      where: {
        id,
      },
    });

    // Send a positive response back to the user
    res.status(200).json({ message: 'Review has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = { createReview, deleteReview, adminDelete };
