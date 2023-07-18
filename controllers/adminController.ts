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
import { log } from 'console';
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

const createAdmin = async (req: Request, res: Response) => {
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

    // Limit the amount of admins created.
    const admins = await prisma.admin.count();
    if (admins >= 5) {
      return res
        .status(400)
        .json({ message: 'Maximum amount of admins has been created.' });
    }

    // Check if the email has already been used
    const adminExists = await prisma.admin.findUnique({
      where: {
        email,
      },
    });
    if (adminExists) {
      return res.status(400).json({ message: 'Email already used' });
    }

    // Hash the password
    password = await bcrypt.hash(password, 8);

    // Create admin
    await prisma.admin.create({
      data: {
        name,
        email,
        password,
      },
    });

    // Send back response
    res.status(201).json({ message: `Admin has been created.` });
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
    const admin = await prisma.admin.findUnique({
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
    if (!admin) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Now compare the passwords
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Unable to login' });
    }

    // Generate an access token
    const accessToken = await generateAccessToken(
      { ...admin, password: undefined },
      process.env.JWT_SECRET_ACCESS_ADMIN
    );

    // Generate an refresh token
    const refreshToken = await generateRefreshToken(
      { ...admin, password: undefined },
      process.env.JWT_SECRET_REFRESH_ADMIN
    );

    // Save the refresh token in the database.
    await prisma.admin.update({
      where: {
        id: admin.id,
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
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.roleName,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    // Remove this token db.
    await prisma.admin.update({
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
      process.env.JWT_SECRET_REFRESH_ADMIN
    );

    // Find the admin in the database using the id encoded in the token
    const admin = await prisma.admin.findFirst({
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

    // Check if admin was found
    if (!admin) {
      res.status(401).json({ message: 'Please authenticate.' });
      return;
    }

    // Generate a new access token
    const accessToken = await generateAccessToken(
      admin,
      process.env.JWT_SECRET_ACCESS_ADMIN
    );

    // Send the access token to the admin
    res.status(200).json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.roleName,
      accessToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.', error });
  }
};

const avatarUpload = async (req: Request, res: Response) => {
  try {
    // Generate a random avatar name.
    const adminAvatar = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });
    let randomImageName;
    if (adminAvatar?.avatarUrl) {
      randomImageName = adminAvatar?.avatarUrl;
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
    const avatar = await prisma.admin.update({
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
    // Get the admin's avatar
    const adminAvatar = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // If the user already uploaded an avatar.
    if (adminAvatar?.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${adminAvatar?.avatarUrl}`,
      });
      await s3.send(command);
    } else {
      return res
        .status(400)
        .json({ message: 'Cannot delete an avatar that does not exist.' });
    }

    // Set the avatarUrl field of the user to null
    await prisma.admin.update({
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
    // Make sure that all admins are not deleted.
    const admins = await prisma.admin.count();
    if (admins === 1) {
      return res.status(400).json({
        message:
          'Sorry, you cannot delete your account because you are the only admin.',
      });
    }

    // Get the admin's avatar
    const adminAvatar = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // If user has an avatar we delete it first.
    if (adminAvatar?.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${adminAvatar?.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Delete the user from the database.
    await prisma.admin.delete({
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
    const user = await prisma.admin.update({
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

const searchCustomers = async (req: Request, res: Response) => {
  try {
    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Query the database.
    const customers = await prisma.customer.findMany({
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
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Return a positive response.
    return res.status(200).json(customers);
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
    const sellers = await prisma.seller.findMany({
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
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Return a positive response.
    return res.status(200).json(sellers);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const searchSeller = async (req: Request, res: Response) => {
  try {
    // Get the id from the request params
    const { id } = req.params;

    // Query the database.
    const seller = await prisma.seller.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        region: true,
        address: true,
        avatarUrl: true,
        phoneNumber: true,
        myProducts: true,
        recievedReports: true,
      },
    });

    // If no seller was found, send back a negative response.
    if (!seller) {
      return res.status(400).json({ message: 'Seller not found.' });
    }

    // Return a positive response.
    return res.status(200).json({ seller });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const searchAdmins = async (req: Request, res: Response) => {
  try {
    // Get the properties from the request query. We must provide them in the frontend.
    let name: string = String(req.query.name);
    let page: number = Number(req.query.page);

    // Configure the pages. Here, the first page will be 1.
    const itemPerPage = 10;
    page = page - 1;

    // Query the database.
    const admins = await prisma.admin.findMany({
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
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Return a positive response.
    return res.status(200).json(admins);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteSeller = async (req: Request, res: Response) => {
  try {
    // Get the id of the seller to be deleted
    const { id } = req.params;

    // delete the seller from the database
    const seller = await prisma.seller.delete({
      where: {
        id,
      },
    });

    // If seller has an avatar we delete it.
    if (seller.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${seller.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Send back a positive response.
    return res.status(200).json({ message: 'Seller has been deleted.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteCustomer = async (req: Request, res: Response) => {
  try {
    // Get the id of the customer to be deleted
    const { id } = req.params;

    // delete the customer from the database
    const customer = await prisma.customer.delete({
      where: {
        id,
      },
    });

    // If customer has an avatar we delete it.
    if (customer.avatarUrl !== null) {
      // Delete image from aws s3
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${customer.avatarUrl}`,
      });
      await s3.send(command);
    }

    // Send back a positive response.
    return res.status(200).json({ message: 'customer has been deleted.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const createSeller = async (req: Request, res: Response) => {
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
    const sellerExists = await prisma.seller.findUnique({
      where: {
        email,
      },
    });
    if (sellerExists) {
      return res.status(400).json({ message: 'Email already used' });
    }

    // Hash the password
    password = await bcrypt.hash(password, 8);

    // Create admin
    await prisma.seller.create({
      data: {
        name,
        email,
        password,
        creator: req.user.id,
      },
    });

    // Send back response
    res.status(201).json({ message: `Seller has been created.` });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    // Getting the user from db.
    let admin = await prisma.admin.findUnique({
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
      },
    });

    // Check if user has an avatar to generate a url for it.
    if (admin?.avatarUrl) {
      const getUrlCommand = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: admin?.avatarUrl,
      });
      const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });
      admin.avatarUrl = `${admin?.avatarUrl} ${url}`;
    }

    // Return a positive response containing the data.
    res.status(200).json(admin);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  try {
    // Get the id of the product.
    const { id } = req.params;

    // Check if the product to be deleted exists.
    const toBeDeletedProduct = await prisma.product.findUnique({
      where: { id },
    });
    if (!toBeDeletedProduct) {
      return res.status(400).json({
        message: 'Sorry, the product you are trying to delete does not exist.',
      });
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

const createCategory = async (req: Request, res: Response) => {
  try {
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
    // Get the id from the request params object
    const { id } = req.params;

    // Get the category to be deleted from the database.
    const category = await prisma.category.findUnique({
      where: {
        id,
      },
    });

    // Check if the category you wanna delete exists
    if (!category) {
      return res.status(400).send({
        message: 'The category you are trying to delete does not exist.',
      });
    }

    // Delete image from aws if there is any.
    if (category?.imageUrl !== null) {
      const command = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `${category?.imageUrl}`,
      });
      await s3.send(command);
    }

    // Delete the category from the database
    await prisma.category.delete({
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

const updateCategory = async (req: Request, res: Response) => {
  try {
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

const uploadCategoryImage = async (req: Request, res: Response) => {
  try {
    // Getting the category id
    const { id } = req.params;

    // Check if an image was provided.
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'Please, provide an image.' });
    }

    // Get the category
    const category = await prisma.category.findUnique({ where: { id } });

    // Check if the category way found
    if (!category) {
      return res.status(400).json({ message: 'No category found.' });
    }

    // Generate a random image name.
    let randomImageName;
    if (category?.imageUrl) {
      randomImageName = category.imageUrl;
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

    // Store data in database.
    const updatedCategory = await prisma.category.update({
      where: {
        id,
      },
      data: {
        imageUrl: randomImageName,
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

const deleteCategoryImage = async (req: Request, res: Response) => {
  try {
    // Getting the category id
    const { id } = req.params;

    // Get the category
    const category = await prisma.category.findUnique({ where: { id } });

    // Check if the category way found
    if (!category) {
      return res.status(400).json({ message: 'No category found.' });
    }

    // Check if the category doesn't have an image
    if (category.imageUrl === null) {
      return res.status(400).json({ message: 'No image to delete.' });
    }

    // Delete image from aws s3
    const command = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `${category?.imageUrl}`,
    });
    await s3.send(command);

    // Update the database.
    await prisma.category.update({
      where: { id },
      data: {
        imageUrl: null,
      },
    });

    // Return positive response.
    return res
      .status(200)
      .send({ message: 'Category image has been deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const getStatistics = async (req: Request, res: Response) => {
  try {
    // Count the number of sellers, customers, products and seller reports.
    const sellers = await prisma.seller.count();
    const customers = await prisma.customer.count();
    const products = await prisma.product.count();
    const sellerReports = await prisma.sellerReport.count();

    // Send a success message containing all the statistics
    res.status(200).json({ sellers, customers, products, sellerReports });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = {
  createAdmin,
  login,
  logout,
  refreshToken,
  avatarUpload,
  deleteAvatar,
  deleteAccount,
  updateAccount,
  searchCustomers,
  searchSellers,
  deleteSeller,
  searchSeller,
  getProfile,
  searchAdmins,
  createSeller,
  deleteCustomer,
  deleteProduct,
  createCategory,
  deleteCategory,
  updateCategory,
  uploadCategoryImage,
  deleteCategoryImage,
  getStatistics,
};
