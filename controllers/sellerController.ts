import { Request, Response } from 'express';
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
import sharp from 'sharp';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const { s3 } = require('../utiles/s3client');
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
const {
  generateAccessToken,
  generateRefreshToken,
} = require('../utiles/generateAuthToken');
const { generateRandomImageName } = require('../utiles/utiles');

const login = async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body;

    // Check if all fields are present
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide email and password' });
    }

    // Validate the email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid Email' });
    }

    // Check if the email matches
    const seller = await prisma.seller.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleName: true,
        password: true,
      },
    });
    if (!seller) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Now compare the passwords
    const isMatch = await bcrypt.compare(password, seller.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Generate an access token
    const accessToken = await generateAccessToken(
      { ...seller, password: undefined },
      process.env.JWT_SECRET_ACCESS_SELLER
    );

    // Generate an refresh token
    const refreshToken = await generateRefreshToken(
      { ...seller, password: undefined },
      process.env.JWT_SECRET_REFRESH_SELLER
    );

    // Save the refresh token in the database.
    await prisma.seller.update({
      where: {
        id: seller.id,
      },
      data: {
        token: refreshToken,
      },
    });

    // Creates Secure Cookie with access token
    res.cookie('refreshToken', refreshToken, {
      secure: process.env.NODE_ENVIRONMENT !== 'development',
      httpOnly: true,
    });

    // Send back response
    res.status(200).json({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      role: seller.roleName,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    // Remove this token db.
    await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        token: null,
      },
    });

    // Creates delete refresh token from cookie
    res.clearCookie('refreshToken');

    // Return a successful response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get the refresh token from the Headers (cookie)
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      return res.status(401).json({ message: 'No refresh token found.' });
    }
    const refreshToken = cookies.refreshToken;

    // Decode the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET_REFRESH_SELLER
    );

    // Find the seller in the database using the id encoded in the token
    const seller = await prisma.seller.findFirst({
      where: {
        id: decoded.id,
        token: refreshToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleName: true,
      },
    });

    // Check if seller was found
    if (!seller) {
      res.status(401).json({ message: 'Please authenticate.' });
      return;
    }

    // Generate a new access token
    const accessToken = await generateAccessToken(
      seller,
      process.env.JWT_SECRET_ACCESS_SELLER
    );

    // Send the access token to the seller
    res.status(200).json({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      role: seller.roleName,
      accessToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.', error });
  }
};

const avatarUpload = async (req: Request, res: Response) => {
  try {
    // Generate a random avatar name.
    const sellerAvatar = await prisma.seller.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });
    let randomImageName;
    if (sellerAvatar?.avatarUrl) {
      randomImageName = sellerAvatar?.avatarUrl;
    } else {
      randomImageName = generateRandomImageName();
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

    // Update the data in the database.
    const avatar = await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        avatarUrl: randomImageName,
      },
      select: {
        avatarUrl: true,
      },
    });

    // Generate a url for the image
    const getUrlCommand = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: randomImageName,
    });
    const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });

    // Send back a successful response with the image url response.
    res.status(200).json({
      avatarUrl: `${avatar?.avatarUrl} ${url}`,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteAvatar = async (req: Request, res: Response) => {
  try {
    // Get the seller's avatar
    const sellerAvatar = await prisma.seller.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // If the user already uploaded an avatar.
    if (sellerAvatar?.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${sellerAvatar?.avatarUrl}`,
      });
      await s3.send(command);
    } else {
      return res
        .status(400)
        .json({ message: 'Cannot delete an avatar that does not exist.' });
    }

    // Set the avatarUrl field of the user to null
    await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        avatarUrl: null,
      },
    });

    // Send back a positive response
    return res
      .status(200)
      .json({ message: 'Avatar has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteAccount = async (req: Request, res: Response) => {
  try {
    // Get the seller's avatar
    const sellerAvatar = await prisma.seller.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // If user has an avatar we delete it first.
    if (sellerAvatar?.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${sellerAvatar?.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Delete the user from the database.
    await prisma.seller.delete({
      where: {
        id: req.user.id,
      },
    });

    // Creates delete refresh token from cookie
    res.clearCookie('refreshToken');

    // Send positive response.
    res
      .status(200)
      .json({ message: 'Your account has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const updateAccount = async (req: Request, res: Response) => {
  try {
    // Get the enteries and create a valid enteries array
    const enteries = Object.keys(req.body);
    const allowedEntery = [
      'name',
      'email',
      'password',
      'country',
      'region',
      'address',
      'phoneNumber',
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

    // Check if the password should be updated and then encrypt it.
    const passwordUpdate = enteries.find((entery) => entery === 'password');
    if (passwordUpdate) {
      req.body.password = await bcrypt.hash(req.body.password, 8);
    }

    // Update the data in the database.
    await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...req.body,
      },
    });

    // Send back positive response.
    res.status(200).json({ message: 'Data has been updated successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    // Getting the user from db.
    let seller = await prisma.seller.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        country: true,
        region: true,
        address: true,
        phoneNumber: true,
        shippingCountries: true,
        shippingRegionsAndPrices: true,
      },
    });

    // Check if user has an avatar to generate a url for it.
    if (seller?.avatarUrl) {
      const getUrlCommand = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: seller?.avatarUrl,
      });
      const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });
      seller.avatarUrl = `${seller?.avatarUrl} ${url}`;
    }

    // Return a positive response containing the data.
    res.status(200).json(seller);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const createProduct = async (req: Request, res: Response) => {
  try {
    // Check if the seller has entered all the data we need him to enter before selling.
    const seller: any = await prisma.seller.findUnique({
      where: { id: req.user.id },
    });

    const { shippingCountries, shippingRegionsAndPrices } = seller;
    if (
      shippingCountries.length === 0 ||
      shippingRegionsAndPrices.length === 0
    ) {
      return res.status(400).send({
        message:
          'Enter all your seller info before you can sell on our platform.',
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
        id,
      },
    });

    // Delete images from aws if there is.
    if (deletedProduct.imagesUrl.length > 0) {
      await Promise.all(
        deletedProduct.imagesUrl.map(async (image) => {
          // Delete image from aws s3
          const command = new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `${image}`,
          });
          await s3.send(command);
        })
      );
    }

    // Send back positive response.
    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const uploadProductImages = async (req: Request, res: Response) => {
  try {
    // Get the id of the product.
    const { id } = req.params;

    // Create an array of images path.
    const images: any = req.files;

    // Get the soon to be updated product.
    const soonToBeUpdatedProduct = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });
    if (!soonToBeUpdatedProduct) {
      return res
        .status(400)
        .json({ message: 'You are not allowed to update this product.' });
    }

    // Should not allow the seller to upload more than 5 images.
    const prevProductImages = soonToBeUpdatedProduct.imagesUrl;
    if (prevProductImages.length + images.length > 5) {
      res.status(400).json({
        message:
          'You are not allowed to upload more than 5 images per product.',
      });
      return;
    }

    // Resize images.
    const resizedImages = await Promise.all(
      images.map(async (image: any) => {
        return await sharp(image.buffer)
          .resize({
            width: 200,
            height: 200,
            fit: 'contain',
          })
          .png()
          .toBuffer();
      })
    );

    // Upload the images to aws.
    let imagesName: any[] = [];
    await Promise.all(
      resizedImages.map(async (image) => {
        const imageName = generateRandomImageName();

        const command = new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: imageName,
          Body: image,
          ContentType: req.file?.mimetype,
        });

        // Get the image that has been uploaded.
        await s3.send(command);

        // Insert the image name in the imagesName array.
        imagesName.push(imageName);
      })
    );

    // Update the database.
    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        imagesUrl: [...prevProductImages, ...imagesName],
      },
    });

    // Send back a positive response containing generated images urls.
    const productImageUrls = await Promise.all(
      updatedProduct.imagesUrl.map(async (image) => {
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
    res.status(200).json(productImageUrls);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteProductImage = async (req: Request, res: Response) => {
  try {
    // We get the product id and the name of the image from the request params.
    const id = String(req.query.id);
    const image = String(req.query.image);

    // Check if the seller is allowed to delete this image.
    const product = await prisma.product.findFirst({
      where: {
        id,
        sellerId: req.user.id,
      },
    });
    if (!product) {
      return res.status(400).json({
        message: 'You are not allowed to make changes on this product.',
      });
    }

    // Check if the image to be deleted exists
    if (!product.imagesUrl.includes(image)) {
      return res.status(400).json({
        message: 'The image you are trying to delete does not exist.',
      });
    }

    // Delete image from aws s3
    const command = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `${image}`,
    });
    await s3.send(command);

    // Delete the product image link from the database.
    const newProductsArray = product.imagesUrl.filter(
      (item: any) => item !== image
    );
    await prisma.product.update({
      where: {
        id,
      },
      data: {
        imagesUrl: newProductsArray,
      },
    });

    // Send back a positive response
    return res
      .status(200)
      .json({ message: 'Product image delete successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  try {
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
        categoryId: true,
      },
    });

    // Send back a positive response.
    return res.status(200).json({ updatedProduct });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeAllMyProducts = async (req: Request, res: Response) => {
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
      sellerId: req.user.id,
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
      include: {
        category: true,
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

const myConversations = async (req: Request, res: Response) => {
  try {
    // Get all the conversations from the database.
    const conversations = await prisma.conversation.findMany({
      where: {
        sellerId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        seller: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        customer: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    // Send back a positive response containing all the conversations.
    res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const sendMessage = async (req: Request, res: Response) => {
  try {
    // Get the text message and the conversation ID from the request body.
    const { text, conversationId } = req.body;

    // Saving the message into the database.
    const message = await prisma.message.create({
      data: {
        conversationId,
        text,
        seller: req.user.id,
      },
    });

    // Send back a positive response containing the message
    res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeSeller = async (req: Request, res: Response) => {
  // Get the id of the seller
  const { id } = req.params;

  try {
    // Getting the user from db.
    let seller = await prisma.seller.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        address: true,
        country: true,
        region: true,
        phoneNumber: true,
        shippingCountries: true,
        shippingRegionsAndPrices: true,
        recievedReports: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            reportMessage: true,
          },
        },
      },
    });

    // Check if user has an avatar to generate a url for it.
    if (seller?.avatarUrl) {
      const getUrlCommand = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: seller?.avatarUrl,
      });
      const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });
      seller.avatarUrl = `${seller?.avatarUrl} ${url}`;
    }

    // Return a positive response containing the data.
    res.status(200).json(seller);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const getStatistics = async (req: Request, res: Response) => {
  try {
    // Get the number of products.
    const products = await prisma.product.count({
      where: {
        sellerId: req.user.id,
      },
    });

    // Get the number of orders.
    const orders = await prisma.order.count({
      where: {
        product: {
          sellerId: req.user.id,
        },
      },
    });

    // Get the number of product reviews.
    const productReviews = await prisma.productReview.count({
      where: {
        product: {
          sellerId: req.user.id,
        },
      },
    });

    // Send back a positive response containing all the data.
    res.status(200).json({ products, orders, productReviews });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  login,
  logout,
  refreshToken,
  avatarUpload,
  deleteAvatar,
  deleteAccount,
  updateAccount,
  getProfile,
  createProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  updateProduct,
  seeAllMyProducts,
  myConversations,
  sendMessage,
  seeSeller,
  getStatistics,
};
