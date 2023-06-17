import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
import { s3 } from '../utiles/s3client';

const seeCategories = async (req: Request, res: Response) => {
  try {
    // Get all the categories from the database.
    const categories = await prisma.category.findMany({});

    // Generate image Urls
    const categoriesWithImagesUrl = await Promise.all(
      categories.map(async (category) => {
        //Generate a url for the image
        if (category.imageUrl !== null) {
          const getUrlCommand = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `${category.imageUrl}`,
          });
          const url = await getSignedUrl(s3, getUrlCommand, {
            expiresIn: 3600,
          });
          category.imageUrl = url;
        }
        return category;
      })
    );

    // Return a positive response with all the categories and products releted to them.
    res.status(200).json(categoriesWithImagesUrl);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  seeCategories,
};
