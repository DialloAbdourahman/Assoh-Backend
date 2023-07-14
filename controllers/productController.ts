const path = require('path');
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import sharp from 'sharp';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
const { s3 } = require('../utiles/s3client');
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const seeProduct = async (req: Request, res: Response) => {
  try {
    // Get the id from the req.params
    const { id } = req.params;

    // Get the product from the database.
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
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
        category: {
          select: {
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            shippingCountries: true,
            shippingRegionsAndPrices: true,
          },
        },
        reviews: {
          select: {
            id: true,
            comment: true,
            rating: true,
            productId: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res
        .status(400)
        .json({ message: 'The product you are looking for does not exist.' });
    }

    // Generate product image urls
    const urls: String[] | any = product?.imagesUrl;
    const productImageUrls = await Promise.all(
      urls.map(async (image: any) => {
        //Generate a url for the image
        const getUrlCommand = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: `${image}`,
        });
        const url = await getSignedUrl(s3, getUrlCommand, {
          expiresIn: 3600,
        });

        return `${image} ${url}`;
      })
    );

    // Send back a positive response to the user.
    res.status(200).json({ ...product, productImageUrls });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeAllProducts = async (req: Request, res: Response) => {
  try {
    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);
    let categoryId: string = String(req.query.categoryId);
    let nameSort: any = String(req.query.nameSort);
    let minPrice: number = Number(req.query.minPrice);
    let maxPrice: number = Number(req.query.maxPrice);
    let rating: number = Number(req.query.rating);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Configuring the search conditionals
    let conditionals: any = {
      name: {
        contains: name,
        mode: 'insensitive',
      },
      price: {
        gte: minPrice,
        lte: maxPrice,
      },
    };
    if (categoryId !== '') {
      conditionals.categoryId = categoryId;
    }
    if (rating !== 0) {
      conditionals.reviews = {
        some: {
          rating: {
            gte: rating,
          },
        },
      };
    }

    // Get the products from the database given the category or not.
    let products;
    products = await prisma.product.findMany({
      take: itemPerPage,
      skip: itemPerPage * page,
      where: conditionals,
      orderBy: {
        name: nameSort,
      },
    });

    // Generate the images urls
    const productsWithImagesUrls = await Promise.all(
      products.map(async (product) => {
        const urls: String[] | any = product?.imagesUrl;
        Promise.all(
          (product.imagesUrl = await Promise.all(
            urls.map(async (image: any) => {
              //Generate a url for the image
              const getUrlCommand = new GetObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: `${image}`,
              });
              const url = await getSignedUrl(s3, getUrlCommand, {
                expiresIn: 3600,
              });

              return `${image} ${url}`;
            })
          ))
        );
        return product;
      })
    );

    // Send back a positive response with all the products.
    res.status(200).json(productsWithImagesUrls);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const searchProduct = async (req: Request, res: Response) => {
  try {
    // Get the name from the request query.
    let name: string = String(req.query.name);

    // Get the products from the database given the category or not.
    let products = await prisma.product.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 5,
      select: {
        id: true,
        name: true,
      },
    });

    // Send back a posite response with all the products.
    res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  seeProduct,
  seeAllProducts,
  searchProduct,
};
