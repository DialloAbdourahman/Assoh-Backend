// import { Request, Response } from 'express';
// import { Prisma, PrismaClient } from '@prisma/client';
// import {
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } from '@aws-sdk/client-s3';
// import sharp from 'sharp';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// const prisma: PrismaClient<
//   Prisma.PrismaClientOptions,
//   never,
//   Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
// > = require('../utiles/prismaClient');
// import { s3 } from '../utiles/s3client';
// const { generateRandomImageName } = require('../utiles/utiles');

// const createCategory = async (req: Request, res: Response) => {
//   try {
//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       res.status(400).send({ message: 'Sorry, you are not an admin.' });
//       return;
//     }

//     // Get all the properties we need from the body.
//     const { name, description } = req.body;

//     // Create it in the database.
//     const category = await prisma.category.create({
//       data: {
//         name,
//         description,
//       },
//     });

//     // Send a positive response to the user with the category created.
//     res.status(201).json(category);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const deleteCategory = async (req: Request, res: Response) => {
//   try {
//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       res.status(400).send({ message: 'Sorry, you are not an admin.' });
//       return;
//     }

//     // Get the id from the request params object
//     const { id } = req.params;

//     // Get the category to be deleted from the database.
//     const category = await prisma.category.findUnique({
//       where: {
//         id,
//       },
//     });

//     // Delete image from aws if there is any.
//     if (category?.imageUrl !== null) {
//       const command = new DeleteObjectCommand({
//         Bucket: process.env.BUCKET_NAME,
//         Key: `${category?.imageUrl}`,
//       });
//       await s3.send(command);
//     }

//     // Delete the category from the database
//     await prisma.category.delete({
//       where: {
//         id,
//       },
//     });

//     // Send a positive response to the user.
//     return res
//       .status(200)
//       .send({ message: 'Category has been deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const seeCategories = async (req: Request, res: Response) => {
//   try {
//     // Get all the categories from the database.
//     const categories = await prisma.category.findMany({});

//     // Generate image Urls
//     const categoriesWithImagesUrl = await Promise.all(
//       categories.map(async (category) => {
//         //Generate a url for the image
//         if (category.imageUrl !== null) {
//           const getUrlCommand = new GetObjectCommand({
//             Bucket: process.env.BUCKET_NAME,
//             Key: `${category.imageUrl}`,
//           });
//           const url = await getSignedUrl(s3, getUrlCommand, {
//             expiresIn: 3600,
//           });
//           category.imageUrl = url;
//         }
//         return category;
//       })
//     );

//     // Return a positive response with all the categories and products releted to them.
//     res.status(200).json(categoriesWithImagesUrl);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const updateCategory = async (req: Request, res: Response) => {
//   try {
//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       res.status(400).send({ message: 'Sorry, you are not an admin.' });
//       return;
//     }

//     // Get category id from req.params
//     const { id } = req.params;

//     // Get the enteries and create a valid enteries array
//     const enteries = Object.keys(req.body);
//     const allowedEntery = ['name', 'description'];

//     // Check if the enteries are valid
//     const isValidOperation = enteries.every((entery) => {
//       return allowedEntery.includes(entery);
//     });

//     // Send negative response if the enteries are not allowed.
//     if (!isValidOperation) {
//       res.status(400).send({ message: 'Invalid data' });
//       return;
//     }

//     // Update the category in the database.
//     const category = await prisma.category.update({
//       where: {
//         id,
//       },
//       data: {
//         ...req.body,
//       },
//     });

//     // Return a positive response to the user with the category.
//     res.status(200).json(category);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const uploadCategoryImage = async (req: Request, res: Response) => {
//   try {
//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       res.status(400).send({ message: 'Sorry, you are not an admin.' });
//       return;
//     }

//     // Getting the category id
//     const { id } = req.params;

//     // Get the category
//     const category = await prisma.category.findUnique({ where: { id } });

//     // Generate a random image name.
//     let randomImageName;
//     if (category?.imageUrl) {
//       randomImageName = category.imageUrl;
//     } else {
//       randomImageName = generateRandomImageName();
//     }

//     // Resize image
//     const buffer = await sharp(req.file?.buffer)
//       .resize({
//         width: 250,
//         height: 250,
//         fit: 'contain',
//       })
//       .png()
//       .toBuffer();

//     // Create the command.
//     const command = new PutObjectCommand({
//       Bucket: process.env.BUCKET_NAME,
//       Key: randomImageName,
//       Body: buffer,
//       ContentType: req.file?.mimetype,
//     });

//     // Get the image that has been uploaded.
//     await s3.send(command);

//     // Store data in database.
//     const updatedCategory = await prisma.category.update({
//       where: {
//         id,
//       },
//       data: {
//         imageUrl: randomImageName,
//       },
//     });

//     // Generate a url for the image
//     const getUrlCommand = new GetObjectCommand({
//       Bucket: process.env.BUCKET_NAME,
//       Key: randomImageName,
//     });
//     const url = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });

//     // Return a positive response.
//     res.status(200).json({ updatedCategory, url });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const deleteCategoryImage = async (req: Request, res: Response) => {
//   try {
//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       res.status(400).send({ message: 'Sorry, you are not an admin.' });
//       return;
//     }

//     // Getting the category id
//     const { id } = req.params;

//     // Get the category
//     const category = await prisma.category.findUnique({ where: { id } });

//     // Delete image from aws s3
//     const command = new DeleteObjectCommand({
//       Bucket: process.env.BUCKET_NAME,
//       Key: `${category?.imageUrl}`,
//     });
//     await s3.send(command);

//     // Update the database.
//     await prisma.category.update({
//       where: { id },
//       data: {
//         imageUrl: null,
//       },
//     });

//     // Return positive response.
//     return res
//       .status(200)
//       .send({ message: 'Category image has been deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// module.exports = {
//   createCategory,
//   deleteCategory,
//   seeCategories,
//   updateCategory,
//   uploadCategoryImage,
//   deleteCategoryImage,
// };
