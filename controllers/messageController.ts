import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');

const create = async (req: Request, res: Response) => {
  try {
    // Get the text message and the conversation ID from the request body.
    const { text, conversationId } = req.body;

    // Saving the message into the database.
    const message = await prisma.message.create({
      data: {
        conversationId,
        text,
        senderId: req.user.id,
      },
    });

    // Send back a positive response containing the message
    res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

const seeAllMessagesOfAConversation = async (req: Request, res: Response) => {
  try {
    // Get the conversation ID from the request params.
    const { id: conversationId } = req.params;

    // Check if the conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });
    if (!conversation) {
      return res
        .status(400)
        .send({ message: 'Sorry, conversation does not exist' });
    }

    // Get all the messages from the database.
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error });
  }
};

module.exports = { create, seeAllMessagesOfAConversation };
