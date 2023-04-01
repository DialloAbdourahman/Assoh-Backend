import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const createCategory = async (req: Request, res: Response) => {
  try {
    // Check it is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).send({ message: 'Sorry, you are not an admin.' });
    }

    // Get all the properties we need from the body.
    const { name, description } = req.body;

    // Create it in the database.
    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    });

    // Send a positive response to the user with the category created.
    res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteCategory = async (req: Request, res: Response) => {
  try {
    // Check it is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).send({ message: 'Sorry, you are not an admin.' });
    }

    // Get the id from the request params object
    const { id } = req.params;

    // Delete the category from the database.
    const category = await prisma.category.delete({
      where: {
        id,
      },
    });

    // Send a positive response to the user.
    return res
      .status(200)
      .send({ message: 'Category has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeCategories = async (req: Request, res: Response) => {
  try {
    // Get all the categories from the database.
    const categories = await prisma.category.findMany({});

    // Return a positive response with all the categories and products releted to them.
    res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeCategory = async (req: Request, res: Response) => {
  try {
    // Get the category id from the request parameters
    const { id } = req.params;

    // Get all the category from the database.
    const categories = await prisma.category.findUnique({
      where: {
        id,
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            quantity: true,
            createdAt: true,
            imagesUrl: true,
            colors: true,
            sizes: true,
          },
        },
      },
    });

    // Return a positive response with all the categories and products releted to them.
    res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const updateCategory = async (req: Request, res: Response) => {
  try {
    // Check it is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).send({ message: 'Sorry, you are not an admin.' });
    }

    // Get category id from req.params
    const { id } = req.params;

    // Get the enteries and create a valid enteries array
    const enteries = Object.keys(req.body);
    const allowedEntery = ['name', 'description'];

    // Check if the enteries are valid
    const isValidOperation = enteries.every((entery) => {
      return allowedEntery.includes(entery);
    });

    // Send negative response if the enteries are not allowed.
    if (!isValidOperation) {
      res.status(400).send({ message: 'Invalid data' });
      return;
    }

    // Update the category in the database.
    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        ...req.body,
      },
    });

    // Return a positive response to the user with the category.
    res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

// upload
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
const s3 = new S3Client({
  credentials: {
    accessKeyId: String(process.env.ACCESS_KEY),
    secretAccessKey: String(process.env.SECRET_ACCESS_KEY),
  },
  region: String(process.env.BUCKET_REGION),
});
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const uploadCategoryImage = async (req: Request, res: Response) => {
  try {
    // Check it is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).send({ message: 'Sorry, you are not an admin.' });
    }

    // Getting the category id
    const { id } = req.params;

    // Get the category
    const category = await prisma.category.findUnique({ where: { id } });

    // Generate a random image name.
    let randomImageName;
    if (category?.image) {
      randomImageName = category.image;
    } else {
      randomImageName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    }

    // Resize image
    const buffer = await sharp(req.file?.buffer)
      .resize({
        width: 250,
        height: 250,
        fit: 'contain',
      })
      .png()
      .toBuffer();

    // Create the command.
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: randomImageName,
      Body: buffer,
      ContentType: req.file?.mimetype,
    });

    // Get the image that has been uploaded.
    await s3.send(command);

    // Store data in database.
    const updatedCategory = await prisma.category.update({
      where: {
        id,
      },
      data: {
        image: randomImageName,
      },
    });

    // Generate a url for the image
    const getUrlCommand = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: randomImageName,
    });
    const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });

    // Return a positive response.
    res.status(200).json({ updatedCategory, url });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  createCategory,
  deleteCategory,
  seeCategories,
  updateCategory,
  seeCategory,
  uploadCategoryImage,
};
