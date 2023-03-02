import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
const jwt = require('jsonwebtoken');

const generateAuthToken = async (id: string) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  await prisma.user.update({
    where: {
      id,
    },
    data: {
      tokens: {
        push: token,
      },
    },
  });
  return token;
};

module.exports = generateAuthToken;
