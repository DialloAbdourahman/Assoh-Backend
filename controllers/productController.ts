// const fs = require('fs');
// const path = require('path');
// import { Request, Response } from 'express';
// import { Prisma, PrismaClient } from '@prisma/client';
// import sharp from 'sharp';
// const prisma: PrismaClient<
//   Prisma.PrismaClientOptions,
//   never,
//   Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
// > = require('../utiles/prismaClient');
// const { generateRandomImageName } = require('../utiles/utiles');
// const { s3 } = require('../utiles/s3client');
// import {
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// const deleteProduct = async (req: Request, res: Response) => {
//   try {
//     // Get the id of the product.
//     const { id } = req.params;

//     // Check it is a seller
//     if (req.user.roleName !== 'seller') {
//       return res.status(400).send({ message: 'Sorry, you are not a seller' });
//     }

//     // To be deleted product.
//     const product = await prisma.product.findFirst({
//       where: {
//         id,
//         sellerId: req.user.id,
//       },
//     });

//     // Check if we can delete this product.
//     if (!product) {
//       return res
//         .status(400)
//         .json({ message: 'you are not allowed to delete this product.' });
//     }

//     // Delete product from database.
//     const deletedProduct = await prisma.product.delete({
//       where: {
//         id: product.id,
//       },
//     });

//     // Delete images from file system if there is.
//     if (deletedProduct.imagesUrl.length > 0) {
//       await Promise.all(
//         deletedProduct.imagesUrl.map(async (image) => {
//           // Delete image from aws s3
//           const command = new DeleteObjectCommand({
//             Bucket: process.env.BUCKET_NAME,
//             Key: `${image}`,
//           });
//           await s3.send(command);
//         })
//       );
//     }

//     // Send back positive response.
//     res.status(200).json({ message: 'Product deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const seeProduct = async (req: Request, res: Response) => {
//   try {
//     // Get the id from the req.params
//     const { id } = req.params;

//     // Get the product from the database.
//     const product = await prisma.product.findUnique({
//       where: {
//         id,
//       },
//       include: {
//         category: true,
//         seller: {
//           include: {
//             user: true,
//           },
//         },
//         reviews: true,
//       },
//     });

//     // Generate product image urls
//     const urls: String[] | any = product?.imagesUrl;
//     const productImageUrls = await Promise.all(
//       urls.map(async (image: any) => {
//         //Generate a url for the image
//         const getUrlCommand = new GetObjectCommand({
//           Bucket: process.env.BUCKET_NAME,
//           Key: `${image}`,
//         });
//         const url = await getSignedUrl(s3, getUrlCommand, {
//           expiresIn: 3600,
//         });

//         return `${image} ${url}`;
//       })
//     );

//     // Product with filtered data.
//     const filteredProduct = {
//       ...product,
//       imagesUrl: productImageUrls,
//       seller: {
//         ...product?.seller,
//         userId: undefined,
//         user: {
//           ...product?.seller.user,
//           id: undefined,
//           tokens: undefined,
//           password: undefined,
//         },
//       },
//     };

//     // Send back a positive response to the user.
//     res.status(200).json(filteredProduct);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const seeAllProducts = async (req: Request, res: Response) => {
//   try {
//     // Get the properties from the request query. We must provide them in the frontend.
//     let name: string = String(req.query.name);
//     let page: number = Number(req.query.page);
//     let categoryId: string = String(req.query.categoryId);

//     // Configure the pages. Here, the first page will be 1.
//     const itemPerPage = 10;
//     page = page - 1;

//     // Get the products from the database given the category or not.
//     let products;
//     if (req.query.categoryId) {
//       products = await prisma.product.findMany({
//         take: itemPerPage,
//         skip: itemPerPage * page,
//         where: {
//           name: {
//             contains: name,
//             mode: 'insensitive',
//           },
//           categoryId,
//         },
//         orderBy: {
//           name: 'asc',
//         },
//       });
//     } else {
//       products = await prisma.product.findMany({
//         take: itemPerPage,
//         skip: itemPerPage * page,
//         where: {
//           name: {
//             contains: name,
//             mode: 'insensitive',
//           },
//         },
//         orderBy: {
//           name: 'asc',
//         },
//       });
//     }

//     // Generate the images urls
//     const productsWithImagesUrls = await Promise.all(
//       products.map(async (product) => {
//         const urls: String[] | any = product?.imagesUrl;
//         Promise.all(
//           (product.imagesUrl = await Promise.all(
//             urls.map(async (image: any) => {
//               //Generate a url for the image
//               const getUrlCommand = new GetObjectCommand({
//                 Bucket: process.env.BUCKET_NAME,
//                 Key: `${image}`,
//               });
//               const url = await getSignedUrl(s3, getUrlCommand, {
//                 expiresIn: 3600,
//               });

//               return `${image} ${url}`;
//             })
//           ))
//         );
//         return product;
//       })
//     );

//     // Send back a positive response with all the products.
//     res.status(200).json(productsWithImagesUrls);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const searchProduct = async (req: Request, res: Response) => {
//   try {
//     // Get the name from the request query.
//     let name: string = String(req.query.name);

//     // Get the products from the database given the category or not.
//     let products = await prisma.product.findMany({
//       where: {
//         name: {
//           contains: name,
//           mode: 'insensitive',
//         },
//       },
//       orderBy: {
//         name: 'asc',
//       },
//       take: 5,
//       select: {
//         id: true,
//         name: true,
//       },
//     });

//     // Send back a posite response with all the products.
//     res.status(200).json(products);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const seeAllMyProducts = async (req: Request, res: Response) => {
//   try {
//     if (req.user.roleName !== 'seller') {
//       return res.status(400).json({ message: 'Sorry, you are not a seller' });
//     }

//     // Get the properties from the request query. We must provide them in the frontend.
//     let name: string = String(req.query.name);
//     let page: number = Number(req.query.page);
//     let categoryId: string = String(req.query.categoryId);

//     // Configure the pages. Here, the first page will be 1.
//     const itemPerPage = 10;
//     page = page - 1;

//     // Get the products from the database given the category or not.
//     let products;
//     if (req.query.categoryId) {
//       products = await prisma.product.findMany({
//         take: itemPerPage,
//         skip: itemPerPage * page,
//         where: {
//           name: {
//             contains: name,
//             mode: 'insensitive',
//           },
//           categoryId,
//         },
//         orderBy: {
//           name: 'asc',
//         },
//       });
//     } else {
//       products = await prisma.product.findMany({
//         take: itemPerPage,
//         skip: itemPerPage * page,
//         where: {
//           name: {
//             contains: name,
//             mode: 'insensitive',
//           },
//         },
//         orderBy: {
//           name: 'asc',
//         },
//       });
//     }

//     // Generate the images urls
//     const productsWithImagesUrls = await Promise.all(
//       products.map(async (product) => {
//         const urls: String[] | any = product?.imagesUrl;
//         Promise.all(
//           (product.imagesUrl = await Promise.all(
//             urls.map(async (image: any) => {
//               //Generate a url for the image
//               const getUrlCommand = new GetObjectCommand({
//                 Bucket: process.env.BUCKET_NAME,
//                 Key: `${image}`,
//               });
//               const url = await getSignedUrl(s3, getUrlCommand, {
//                 expiresIn: 3600,
//               });

//               return `${image} ${url}`;
//             })
//           ))
//         );
//         return product;
//       })
//     );

//     // Send back a posite response with all the products.
//     res.status(200).json(productsWithImagesUrls);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const updateProduct = async (req: Request, res: Response) => {
//   try {
//     // We first check if you are a seller.
//     if (req.user.roleName !== 'seller') {
//       return res.status(400).json({ message: 'Sorry, you are not a seller' });
//     }

//     // Get product id from req.params
//     const { id } = req.params;

//     // Get the enteries and create a valid enteries array
//     const enteries = Object.keys(req.body);
//     const allowedEntery = [
//       'name',
//       'description',
//       'price',
//       'quantity',
//       'categoryId',
//     ];

//     // Check if the enteries are valid
//     const isValidOperation = enteries.every((entery) => {
//       return allowedEntery.includes(entery);
//     });

//     // Send negative response if the enteries are not allowed.
//     if (!isValidOperation) {
//       res.status(400).send({ message: 'Invalid data' });
//       return;
//     }

//     // Check if the product exist and if the seller can update it.
//     const product = await prisma.product.findFirst({
//       where: {
//         id,
//         sellerId: req.user.id,
//       },
//     });
//     if (!product) {
//       return res
//         .status(500)
//         .json({ message: 'Sorry, you are not allowed to update this product' });
//     }

//     // Now we can update the product
//     const updatedProduct = await prisma.product.update({
//       where: {
//         id: product.id,
//       },
//       data: {
//         ...req.body,
//       },
//     });

//     // Send back a positive response.
//     return res.status(200).json({ ...updatedProduct, sellerId: undefined });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const uploadImages = async (req: Request, res: Response) => {
//   try {
//     // We first check if you are a seller.
//     if (req.user.roleName !== 'seller') {
//       res.status(400).json({ message: 'Sorry, you are not a seller' });
//       return;
//     }

//     // Get the id of the product.
//     const { id } = req.params;

//     // Create an array of images path.
//     const images: any = req.files;

//     // Get the soon to be updated product.
//     const soonToBeUpdatedProduct = await prisma.product.findFirst({
//       where: {
//         id,
//         sellerId: req.user.id,
//       },
//     });
//     if (!soonToBeUpdatedProduct) {
//       return res
//         .status(400)
//         .json({ message: 'You are not allowed to update this product.' });
//     }

//     // Should not allow the seller to upload more than 5 images.
//     const prevProductImages = soonToBeUpdatedProduct.imagesUrl;
//     if (prevProductImages.length + images.length > 5) {
//       res.status(400).json({
//         message:
//           'You are not allowed to upload more than 5 images per product.',
//       });
//       return;
//     }

//     // Resize images.
//     const resizedImages = await Promise.all(
//       images.map(async (image: any) => {
//         return await sharp(image.buffer)
//           .resize({
//             width: 50,
//             height: 50,
//             fit: 'contain',
//           })
//           .png()
//           .toBuffer();
//       })
//     );

//     // Upload the images to aws.
//     let imagesName: any[] = [];
//     await Promise.all(
//       resizedImages.map(async (image) => {
//         const imageName = generateRandomImageName();

//         const command = new PutObjectCommand({
//           Bucket: process.env.BUCKET_NAME,
//           Key: imageName,
//           Body: image,
//           ContentType: req.file?.mimetype,
//         });

//         // Get the image that has been uploaded.
//         await s3.send(command);

//         // Insert the image name in the imagesName array.
//         imagesName.push(imageName);
//       })
//     );

//     // Update the database.
//     const updatedProduct = await prisma.product.update({
//       where: {
//         id,
//       },
//       data: {
//         imagesUrl: [...prevProductImages, ...imagesName],
//       },
//     });

//     // Send back a positive response containing generated images urls.
//     const productImageUrls = await Promise.all(
//       updatedProduct.imagesUrl.map(async (image) => {
//         //Generate a url for the image
//         const getUrlCommand = new GetObjectCommand({
//           Bucket: process.env.BUCKET_NAME,
//           Key: `${image}`,
//         });
//         const url = await getSignedUrl(s3, getUrlCommand, {
//           expiresIn: 3600,
//         });

//         return `${image} ${url}`;
//       })
//     );
//     res.status(200).json(productImageUrls);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const deleteImage = async (req: Request, res: Response) => {
//   try {
//     // We get the product id and the name of the image from the request params.
//     const id = String(req.query.id);
//     const image = String(req.query.image);

//     // Check it is a seller
//     if (req.user.roleName !== 'seller') {
//       return res.status(400).send({ message: 'Sorry, you are not a seller' });
//     }

//     // Check if the seller is allowed to delete this image.
//     const product = await prisma.product.findFirst({
//       where: {
//         id,
//         sellerId: req.user.id,
//       },
//     });
//     if (!product) {
//       return res
//         .status(400)
//         .json({ message: 'You are not allowed to delete this image.' });
//     }

//     // Check if the image to be deleted exists
//     if (!product.imagesUrl.includes(image)) {
//       return res.status(400).json({
//         message: 'The image you are trying to delete does not exist.',
//       });
//     }

//     // Delete image from aws s3
//     const command = new DeleteObjectCommand({
//       Bucket: process.env.BUCKET_NAME,
//       Key: `${image}`,
//     });
//     await s3.send(command);

//     // Delete the product image link from the database.
//     const newProductsArray = product.imagesUrl.filter(
//       (item: any) => item !== image
//     );
//     await prisma.product.update({
//       where: {
//         id,
//       },
//       data: {
//         imagesUrl: newProductsArray,
//       },
//     });

//     // Send back a positive response
//     return res
//       .status(200)
//       .json({ message: 'Product image delete successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const adminDeleteProduct = async (req: Request, res: Response) => {
//   try {
//     // Get the id of the product.
//     const { id } = req.params;

//     // Check it is an admin.
//     if (req.user.roleName !== 'admin') {
//       return res.status(400).send({ message: 'Sorry, you are not an admin.' });
//     }

//     // Delete product from database.
//     const deletedProduct = await prisma.product.delete({
//       where: {
//         id,
//       },
//     });

//     // Delete images from file system if there is.
//     if (deletedProduct.imagesUrl.length > 0) {
//       await Promise.all(
//         deletedProduct.imagesUrl.map(async (image) => {
//           // Delete image from aws s3
//           const command = new DeleteObjectCommand({
//             Bucket: process.env.BUCKET_NAME,
//             Key: `${image}`,
//           });
//           await s3.send(command);
//         })
//       );
//     }

//     // Send back positive response.
//     res.status(200).json({ message: 'Product deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// module.exports = {
//   createProduct,
//   deleteProduct,
//   seeProduct,
//   seeAllProducts,
//   seeAllMyProducts,
//   updateProduct,
//   uploadImages,
//   deleteImage,
//   adminDeleteProduct,
//   searchProduct,
// };
