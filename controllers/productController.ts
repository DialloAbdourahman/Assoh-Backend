const fs = require('fs');
const path = require('path');
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const createProduct = async (req: Request, res: Response) => {
  try {
    // Check it is a seller
    if (req.user.roleName !== 'seller') {
      return res.status(400).send({ message: 'Sorry, you are not a seller' });
    }

    // Check if the seller has entered all the data we need him to enter before selling.
    const { shippingCountries, shippingRegionsAndPrices } = req.user.sellerInfo;
    if (
      shippingCountries.length === 0 ||
      shippingRegionsAndPrices.length === 0
    ) {
      return res.status(400).send({
        message:
          'Enter all you seller info before you can sell on our platform.',
      });
    }

    // Get the enteries and create a valid enteries array
    const enteries = Object.keys(req.body);
    const allowedEntery = [
      'name',
      'description',
      'price',
      'quantity',
      'categoryId',
    ];

    // Check if the enteries are valid
    const isValidOperation = enteries.every((entery) => {
      return allowedEntery.includes(entery);
    });

    // Send negative response if the enteries are not allowed.
    if (!isValidOperation) {
      res.status(400).send({ message: 'Invalid data' });
      return;
    }

    // Create a product
    const product = await prisma.product.create({
      data: {
        ...req.body,
        sellerId: req.user.id,
      },
    });

    // Send back positive response.
    res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  try {
    // Get the id of the product.
    const { id } = req.params;

    // Check it is a seller
    if (req.user.roleName !== 'seller') {
      return res.status(400).send({ message: 'Sorry, you are not a seller' });
    }

    // To be deleted product.
    const product = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });

    // Check if we can delete this product.
    if (!product) {
      return res
        .status(400)
        .json({ message: 'you are not allowed to delete this product.' });
    }

    // Delete product from database.
    const deletedProduct = await prisma.product.delete({
      where: {
        id: product.id,
      },
    });

    // Delete images from file system if there is.
    if (deletedProduct.imagesUrl.length > 0) {
      deletedProduct.imagesUrl.map(async (image) => {
        await fs.unlinkSync(path.join(__dirname, '../', image));
      });
    }

    // Send back positive response.
    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeProduct = async (req: Request, res: Response) => {
  try {
    // Get the id from the req.params
    const { id } = req.params;

    // Get the product from the database.
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        seller: {
          include: {
            user: true,
          },
        },
        reviews: true,
      },
    });

    // Product with filtered data.
    const filteredProduct = {
      ...product,
      seller: {
        ...product?.seller,
        userId: undefined,
        user: {
          ...product?.seller.user,
          id: undefined,
          tokens: undefined,
          password: undefined,
        },
      },
    };

    // Send back a positive response to the user.
    res.status(200).json(filteredProduct);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeAllProducts = async (req: Request, res: Response) => {
  try {
    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Get the products from the database.
    const products = await prisma.product.findMany({
      take: itemPerPage,
      skip: itemPerPage * page,
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Send back a posite response with all the products.
    res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeAllMyProducts = async (req: Request, res: Response) => {
  try {
    if (req.user.roleName !== 'seller') {
      return res.status(400).json({ message: 'Sorry, you are not a seller' });
    }

    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Get the products from the database.
    const products = await prisma.product.findMany({
      take: itemPerPage,
      skip: itemPerPage * page,
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        sellerId: req.user.id,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Send back a posite response with all the products.
    res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  try {
    // We first check if you are a seller.
    if (req.user.roleName !== 'seller') {
      return res.status(400).json({ message: 'Sorry, you are not a seller' });
    }

    // Get product id from req.params
    const { id } = req.params;

    // Get the enteries and create a valid enteries array
    const enteries = Object.keys(req.body);
    const allowedEntery = [
      'name',
      'description',
      'price',
      'quantity',
      'categoryId',
    ];

    // Check if the enteries are valid
    const isValidOperation = enteries.every((entery) => {
      return allowedEntery.includes(entery);
    });

    // Send negative response if the enteries are not allowed.
    if (!isValidOperation) {
      res.status(400).send({ message: 'Invalid data' });
      return;
    }

    // Check if the product exist and if the seller can update it.
    const product = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });
    if (!product) {
      return res
        .status(500)
        .json({ message: 'Sorry, you are not allowed to update this product' });
    }

    // Now we can update the product
    const updatedProduct = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        ...req.body,
      },
    });

    // Send back a positive response.
    return res.status(200).json({ ...updatedProduct, sellerId: undefined });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const uploadImages = async (req: Request, res: Response) => {
  try {
    // Get the id of the product.
    const { id } = req.params;

    // Create an array of images path.
    const images: any = req.files;
    const imagesPath = images.map((item: any) => {
      return item.path;
    });

    // We first check if you are a seller.
    if (req.user.roleName !== 'seller') {
      imagesPath.forEach(async (image: any) => {
        await fs.unlinkSync(path.join(__dirname, '../', image));
      });
      return res.status(400).json({ message: 'Sorry, you are not a seller' });
    }

    // Get the soon to be updated product.
    const soonToBeUpdatedProduct = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });

    // Since multer is a middleware (that comes after the auth middleware), it will first upload the images after if has successfully been authorized by the auth middleware even if the user is not the one who created the product. Fortunately, it will not reach the database to update the imagesUrl record but we will need to delete those images immediately.
    if (!soonToBeUpdatedProduct) {
      imagesPath.forEach(async (image: any) => {
        await fs.unlinkSync(path.join(__dirname, '../', image));
      });
      return res
        .status(400)
        .json({ message: 'You are not allowed to update this product.' });
    }

    // Should not allow the seller to upload more than 5 images, and if he does we delete it. Don't forget that multer would've uploaded the images before checking, this that is why we have to do this.
    const prevProductImages = soonToBeUpdatedProduct.imagesUrl;
    if (prevProductImages.length + imagesPath.length > 5) {
      imagesPath.forEach(async (image: any) => {
        await fs.unlinkSync(path.join(__dirname, '../', image));
      });
      return res.status(400).json({
        message:
          'You are not allowed to upload more than 5 images per product.',
      });
    }

    // Update the database.
    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        imagesUrl: [...prevProductImages, ...imagesPath],
      },
    });

    // Send back a positive response containing the images urls.
    res.status(200).json(updatedProduct.imagesUrl);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteImage = async (req: Request, res: Response) => {
  try {
    // We get the product id and the name of the image from the request params.
    const id = String(req.query.id);
    const image = String(req.query.image);

    // Check it is a seller
    if (req.user.roleName !== 'seller') {
      return res.status(400).send({ message: 'Sorry, you are not a seller' });
    }

    // Check if the seller is allowed to delete this image.
    const product = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });
    if (!product) {
      return res
        .status(400)
        .json({ message: 'You are not allowed to delete this image.' });
    }

    // Delete the product from the file system.
    await fs.unlinkSync(path.join(__dirname, '../', image));

    // Delete the product image link from the database.
    const newProductsArray = product.imagesUrl.filter(
      (item: any) => item !== image
    );
    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        imagesUrl: newProductsArray,
      },
    });

    // Send back a positive response
    res.status(200).json(updatedProduct.imagesUrl);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const adminDeleteProduct = async (req: Request, res: Response) => {
  try {
    // Get the id of the product.
    const { id } = req.params;

    // Check it is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).send({ message: 'Sorry, you are not an admin.' });
    }

    // Delete product from database.
    const deletedProduct = await prisma.product.delete({
      where: {
        id,
      },
    });

    // Delete images from file system if there is.
    if (deletedProduct.imagesUrl.length > 0) {
      deletedProduct.imagesUrl.map(async (image) => {
        await fs.unlinkSync(path.join(__dirname, '../', image));
      });
    }

    // Send back positive response.
    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  createProduct,
  deleteProduct,
  seeProduct,
  seeAllProducts,
  seeAllMyProducts,
  updateProduct,
  uploadImages,
  deleteImage,
  adminDeleteProduct,
};
