// import { Request, Response } from 'express';
// import { Prisma, PrismaClient } from '@prisma/client';
// const prisma: PrismaClient<
//   Prisma.PrismaClientOptions,
//   never,
//   Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
// > = require('../utiles/prismaClient');

// const create = async (req: Request, res: Response) => {
//   try {
//     // Make sure that a user cannot initiate a conversation with him/her self.
//     if (req.user.id === req.params.id) {
//       return res.status(400).json({
//         message:
//           'Sorry, you cannot initiate a conversation with yourself. So please, stop it get some help.',
//       });
//     }

//     // Check if it is a buyer who initiated the conversation
//     if (req.user.roleName !== 'buyer') {
//       return res.status(400).json({
//         message:
//           'Sorry, only a buyer can initiate a conversation. So please, stop it get some help.',
//       });
//     }

//     // Make sure that the buyer has initiated a conversation with a seller.
//     const seller = await prisma.user.findUnique({
//       where: {
//         id: req.params.id,
//       },
//     });
//     if (seller?.roleName !== 'seller') {
//       return res.status(400).json({
//         message:
//           'Sorry, you can only initiate a conversation with a seller. So please, stop it get some help.',
//       });
//     }

//     // Storing in the database
//     const conversation = await prisma.conversation.create({
//       data: {
//         sellerId: req.params.id,
//         buyerId: req.user.id,
//       },
//       include: {
//         seller: {
//           select: {
//             name: true,
//             avatarUrl: true,
//           },
//         },
//         buyer: {
//           select: {
//             name: true,
//             avatarUrl: true,
//           },
//         },
//       },
//     });
//     // Return a positive response containing the conversation.
//     res.status(201).json(conversation);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// const myConversations = async (req: Request, res: Response) => {
//   try {
//     // Get all the conversations from the database.
//     const conversations = await prisma.conversation.findMany({
//       where: {
//         OR: [
//           {
//             sellerId: {
//               equals: req.user.id,
//             },
//           },
//           {
//             buyerId: {
//               equals: req.user.id,
//             },
//           },
//         ],
//       },
//       orderBy: {
//         createdAt: 'desc',
//       },
//       include: {
//         seller: {
//           select: {
//             name: true,
//             avatarUrl: true,
//           },
//         },
//         buyer: {
//           select: {
//             name: true,
//             avatarUrl: true,
//           },
//         },
//       },
//     });
//     // Send back a positive response containing all the conversations.
//     res.status(200).json(conversations);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// // When a buyer clicks on contact a seller, we first check if a conversation already exist between them using this route. If yes we just open messages related to this conversation else we create a new conversation before opening a message page.
// const getASpecificConversation = async (req: Request, res: Response) => {
//   try {
//     // Get the id of the seller
//     const { id: sellerId } = req.params;

//     // Make sure that only a buyer is allowed to use this route.
//     if (req.user.roleName !== 'buyer') {
//       return res.status(400).json({
//         message:
//           'Sorry, only a buyer can use this route. So please, stop it get some help.',
//       });
//     }

//     // Get the conversation from the database.
//     const conversation = await prisma.conversation.findFirst({
//       where: {
//         buyerId: req.user.id,
//         sellerId: sellerId,
//       },
//     });

//     // Send back a positive response containing the conversation.
//     res.status(200).json(conversation);
//   } catch (error) {
//     return res.status(500).json({ message: 'Something went wrong.', error });
//   }
// };

// module.exports = { create, myConversations, getASpecificConversation };
