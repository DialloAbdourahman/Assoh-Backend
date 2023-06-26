// import { Request, Response } from 'express';
// import { Prisma, PrismaClient } from '@prisma/client';
// const prisma: PrismaClient<
//   Prisma.PrismaClientOptions,
//   never,
//   Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
// > = require('../utiles/prismaClient');

// const createReport = async (req: Request, res: Response) => {
//   try {
//     // Should not allow an admin to post a review
//     if (req.user.roleName === 'admin') {
//       res.status(400).send({ message: 'This route is not for admins.' });
//       return;
//     }

//     // Getting all the data needed.
//     const { sellerId, message } = req.body;

//     // Check if the sellerId and the message is provided.
//     if (!sellerId || !message) {
//       return res
//         .status(400)
//         .json({ message: 'Please enter all the information needed.' });
//     }

//     // Check if the seller is reporting him/her self.
//     if (req.user.id === sellerId) {
//       return res
//         .status(400)
//         .json({ message: 'Sorry, you cannot report your self.' });
//     }

//     // Create the report in the database
//     await prisma.sellerReport.create({
//       data: {
//         reporterId: req.user.id,
//         sellerId,
//         reportMessage: message,
//       },
//     });

//     // Send a positive response to the user.
//     res.status(201).json({ message: 'Seller reported successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const deleteReport = async (req: Request, res: Response) => {
//   try {
//     // Should not allow an admin to post a review
//     if (req.user.roleName === 'admin') {
//       res.status(400).send({ message: 'This route is not for admins.' });
//       return;
//     }

//     // Get the id of the report we wanna delete.
//     const { id } = req.params;

//     // Get the report.
//     const report = await prisma.sellerReport.findFirst({
//       where: {
//         id,
//         reporterId: req.user.id,
//       },
//     });

//     // Check if the report exist.
//     if (!report) {
//       return res
//         .status(400)
//         .json({ message: 'You are not allowed to delete this report.' });
//     }

//     // Delete report from db.
//     await prisma.sellerReport.delete({
//       where: {
//         id,
//       },
//     });

//     // Send a positive response back to the user
//     res.status(200).json({ message: 'Report has been deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const adminDelete = async (req: Request, res: Response) => {
//   try {
//     // Check if the user is an admin.
//     if (req.user.roleName !== 'admin') {
//       return res.status(400).json({ message: 'Sorry, you are not an admin.' });
//     }

//     // Get the id of the review.
//     const { id } = req.params;

//     // Delete the review from db.
//     await prisma.sellerReport.delete({
//       where: {
//         id,
//       },
//     });

//     // Send a positive response back to the user
//     res.status(200).json({ message: 'Report has been deleted successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// module.exports = { createReport, deleteReport, adminDelete };
