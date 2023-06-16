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
    await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        avatarUrl: randomImageName,
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
      url,
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
    console.log(seller);

    const { shippingCountries, shippingRegionsAndPrices } = seller;
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
};
