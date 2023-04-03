const fs = require('fs');
const path = require('path');
import { Request, Response } from 'express';
const validator = require('validator');
const bcrypt = require('bcrypt');
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
const generateAuthToken = require('../utiles/generateAuthToken');
const { generateRandomImageName } = require('../utiles/utiles');

const createUser = async (req: Request, res: Response) => {
  try {
    let { name, email, password } = req.body;

    // Check if all fields are present
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide name, email and password' });
    }

    // Validate the email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid Email' });
    }

    // Check if the email has already been used
    const userExists = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (userExists) {
      return res.status(400).json({ message: 'Email already used' });
    }

    // Hash the password
    password = await bcrypt.hash(password, 8);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleName: true,
      },
    });

    // Generate auth token
    const token = await generateAuthToken(user.id);

    // Send back response
    res
      .status(201)
      .json({ name: user.name, email: user.email, role: user.roleName, token });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

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
    const user = await prisma.user.findUnique({
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

    if (!user) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Now compare the passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Generate a token
    const token = await generateAuthToken(user.id);

    // Send back response
    res
      .status(200)
      .json({ name: user.name, email: user.email, role: user.roleName, token });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    // Remove this token from the array of tokens.
    const newTokens = req.user.tokens.filter((tok: any) => {
      return tok !== req.token;
    });

    // Update the tokens array in the database.
    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        tokens: newTokens,
      },
    });

    // Return a successful response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const avatarUpload = async (req: Request, res: Response) => {
  try {
    // Generate a random avatar name.
    let randomImageName;
    if (req.user.avatarUrl) {
      randomImageName = req.user.avatarUrl;
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
    const updatedUser = await prisma.user.update({
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
      updatedUser,
      url,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteAvatar = async (req: Request, res: Response) => {
  try {
    // If the user already uploaded an avatar.
    if (req.user.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${req.user.avatarUrl}`,
      });
      await s3.send(command);
    } else {
      return res
        .status(400)
        .json({ message: 'Cannot delete an avatar that does not exist.' });
    }

    // Set the avatarUrl field of the user to null
    await prisma.user.update({
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

const deleteUser = async (req: Request, res: Response) => {
  try {
    // If user has an avatar we delete it first.
    if (req.user.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${req.user.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Delete the user from the database.
    await prisma.user.delete({
      where: {
        id: req.user.id,
      },
    });

    // Send positive response.
    res.status(200).json({ message: 'user has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    // Check if it is a seller.
    if (req.user.roleName === 'seller') {
      res.status(400).send({ message: 'This route is not for users.' });
      return;
    }

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
    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...req.body,
      },
    });

    // Send back positive response.
    res
      .status(200)
      .json({ name: user.name, email: user.email, role: user.roleName });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const sellerUpdate = async (req: Request, res: Response) => {
  try {
    // Check if it is a seller.
    if (req.user.roleName !== 'seller') {
      res.status(400).send({ message: 'This route is just for sellers.' });
      return;
    }

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
      'shippingCountries',
      'shippingRegionsAndPrices',
    ];

    // Get all the properties of from the request body.
    const {
      name,
      email,
      password,
      country,
      region,
      address,
      phoneNumber,
      shippingCountries,
      shippingRegionsAndPrices,
    } = req.body;

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
    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        name,
        email,
        password,
        country,
        region,
        address,
        phoneNumber,
        sellerInfo: {
          update: {
            shippingCountries,
            shippingRegionsAndPrices,
          },
        },
      },
    });

    // Send back positive response.
    res
      .status(200)
      .json({ name: user.name, email: user.email, role: user.roleName });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const adminSearchUsers = async (req: Request, res: Response) => {
  try {
    // Check if the requesting user is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).json({ message: 'Sorry you are not an admin.' });
    }

    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);
    let role: string = String(req.query.role);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Query the database.
    const users = await prisma.user.findMany({
      take: itemPerPage,
      skip: itemPerPage * page,
      where: {
        roleName: role,
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        sellerInfo: {
          include: {
            myProducts: true,
            recievedReports: true,
          },
        },
        productReviews: true,
        sellerReports: true,
        orders: true,
      },
    });

    // Filter data that we wanna display.
    const filteredData = users.map((user) => {
      return { ...user, password: undefined, tokens: undefined };
    });

    // Return a positive response.
    return res.status(200).json(filteredData);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const searchSellers = async (req: Request, res: Response) => {
  try {
    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Query the database.
    const users = await prisma.user.findMany({
      take: itemPerPage,
      skip: itemPerPage * page,
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        roleName: 'seller',
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filter data that we wanna display.
    const filteredData = users.map((user) => {
      return { ...user, password: undefined, tokens: undefined, id: undefined };
    });

    // Return a positive response.
    return res.status(200).json(filteredData);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const adminDelete = async (req: Request, res: Response) => {
  try {
    // Check if the requesting user is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).json({ message: 'Sorry you are not an admin.' });
    }

    // Get the id in request params
    const { id } = req.params;

    // delete the user from the database
    const user = await prisma.user.delete({
      where: {
        id,
      },
    });

    // If user has an avatar we delete it.
    if (user.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${user.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Send back a positive response.
    return res.status(200).json({ message: 'User has been deleted.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const adminTransform = async (req: Request, res: Response) => {
  try {
    // Check if the requesting user is an admin.
    if (req.user.roleName !== 'admin') {
      return res.status(400).json({ message: 'Sorry you are not an admin.' });
    }

    // Get the id of the user you wanna change into a seller
    const { id } = req.params;

    // Get the role.
    const { role } = req.query;

    // Check if roles entered are correct
    if (!(role === 'seller' || role === 'buyer' || role === 'admin')) {
      return res.status(400).json({ message: 'No such role.' });
    }

    // If seller
    if (role === 'seller') {
      // Update the user role in the user table.
      await prisma.user.update({
        where: {
          id,
        },
        data: {
          roleName: role,
        },
      });

      // Create an instance of this user in the sellerinfo table using the id from the req.params.
      await prisma.sellerInfo.create({
        data: {
          userId: id,
        },
      });

      // Send back a positive response.
      return res.status(200).json({ message: 'User is now a seller.' });
    }

    // Update the user role in the user table.
    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        roleName: role,
      },
      include: { sellerInfo: true },
    });

    // Check if this user was a seller so we can delete his/her seller info.
    if (user.sellerInfo !== null) {
      await prisma.sellerInfo.delete({
        where: {
          userId: user.id,
        },
      });
    }

    // Send back a positive response.
    return res.status(200).json({ message: `User is now a/an ${role}.` });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const searchSeller = async (req: Request, res: Response) => {
  try {
    // Get the id from the request params
    const { id } = req.params;

    // Query the database.
    const user = await prisma.user.findFirst({
      where: {
        id,
        roleName: 'seller',
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

    // If no seller was found, send back a negative response.
    if (!user) {
      return res.status(400).json({ message: 'Seller not found.' });
    }

    // Return a positive response.
    return res
      .status(200)
      .json({ ...user, password: undefined, tokens: undefined, id: undefined });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  createUser,
  login,
  logout,
  avatarUpload,
  deleteAvatar,
  deleteUser,
  updateUser,
  adminSearchUsers,
  searchSellers,
  adminDelete,
  adminTransform,
  searchSeller,
  sellerUpdate,
};
