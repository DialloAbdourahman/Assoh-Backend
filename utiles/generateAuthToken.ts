import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
const jwt = require('jsonwebtoken');

const generateAccessToken = async (data: any, secrete: String) => {
  const token = jwt.sign({ data }, secrete, {
    expiresIn: '15m',
  });
  return token;
};

const generateRefreshToken = async (data: any, secrete: string) => {
  const token = jwt.sign({ data }, secrete, {
    expiresIn: '7d',
  });
  return token;
};

module.exports = { generateAccessToken, generateRefreshToken };
