const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
import { Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../../utiles/prismaClient');

// Hashed passords of userOne and userTwo
const hashedPasswords = async () => {
  const userOneHashedPassord = await bcrypt.hash('diallo1234', 8);
  const userTwoHashedPassord = await bcrypt.hash('eren1234', 8);
  const userThreeHashedPassord = await bcrypt.hash('reiner1234', 8);

  return { userOneHashedPassord, userTwoHashedPassord, userThreeHashedPassord };
};

// Creating the admin role
const adminRole = {
  name: 'admin',
  description: 'This is the admin',
};

// Creating the seller role
const sellerRole = {
  name: 'seller',
  description: 'This is the seller',
};

// Creating the buyer role
const buyerRole = {
  name: 'buyer',
  description: 'This is the buyer',
};

// Creating an initial admin assoh
const userOneId = '1234';
const userOne = {
  id: userOneId,
  name: 'Diallo Abdourahman',
  email: 'dialliabdourahman78@gmail.com',
  password: 'diallo1234',
  phoneNumber: '658167685',
  country: 'Cameroon',
  region: 'Yaounde',
  address: 'Nkolbisson',
  tokens: [jwt.sign({ id: userOneId }, process.env.JWT_SECRET)],
  roleName: 'admin',
};
const userOneCopy = userOne;

// Creating a seller
const userTwoId = '5678';
const userTwo = {
  id: userTwoId,
  name: 'Eren Jager',
  email: 'eren@gmail.com',
  password: 'eren1234',
  phoneNumber: '658167685',
  country: 'Cameroon',
  region: 'Yaounde',
  address: 'Poste Central',
  tokens: [jwt.sign({ id: userTwoId }, process.env.JWT_SECRET)],
  roleName: 'seller',
};
const sellerInfo = {
  userId: userTwo.id,
  shippingCountries: ['Cameroon'],
  shippingRegionsAndPrices: [
    {
      name: 'Yaounde',
      price: 3000,
    },
    {
      name: 'Douala',
      price: 2000,
    },
  ],
};
const userTwoCopy = userTwo;

// Creating a buyer
const userThreeId = '9101';
const userThree = {
  id: userThreeId,
  name: 'Reiner Braun',
  email: 'reiner@gmail.com',
  password: 'reiner1234',
  phoneNumber: '658167685',
  country: 'Cameroon',
  region: 'Yaounde',
  address: 'Mvob Mbi',
  tokens: [jwt.sign({ id: userThreeId }, process.env.JWT_SECRET)],
  roleName: 'buyer',
};
const userThreeCopy = userThree;

// This is the first category and it is the manga category.
const categoryOne = {
  id: '1234',
  name: 'Manga',
  description: 'This is the manga category.',
};

// This is the second category and it is the manga category.
const categoryTwo = {
  id: '5678',
  name: 'Dressin',
  description: 'This is the dressin category.',
};

// Creating the first product
const productOneId = '1234';
const productOne = {
  id: productOneId,
  name: 'Fullmetal Achemist Manga',
  description: 'This is a manga that talks about alchemy.',
  price: 12000,
  quantity: 5,
  sellerId: userTwoId,
  categoryId: categoryOne.id,
};

const productTwoId = '5678';
const productTwo = {
  id: productTwoId,
  name: 'Attack on Titan Manga',
  description: 'This is a manga that talks about titans.',
  price: 10000,
  quantity: 2,
  sellerId: userTwoId,
  categoryId: categoryOne.id,
};

const productReviewId = '1234';
const productReview = {
  id: productReviewId,
  userId: userThreeId,
  productId: productOneId,
  rating: 5,
  comment: 'This is the greatest manga ever',
};

const sellerReportId = '1234';
const sellerReport = {
  id: sellerReportId,
  reporterId: userThreeId,
  sellerId: userTwoId,
  reportMessage: 'This seller is a scammer.',
};

const conversationId = '1234';
const conversation = {
  id: conversationId,
  sellerId: userTwo.id,
  buyerId: userThree.id,
};

const messageId = '1234';
const message = {
  id: messageId,
  conversationId,
  senderId: userThree.id,
  text: 'Hey Mr Eren',
};

const setUpDatabase = async () => {
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  await prisma.role.create({
    data: adminRole,
  });
  await prisma.role.create({
    data: sellerRole,
  });
  await prisma.role.create({
    data: buyerRole,
  });

  await prisma.user.create({
    data: {
      ...userOneCopy,
      password: await (await hashedPasswords()).userOneHashedPassord,
    },
  });
  await prisma.user.create({
    data: {
      ...userTwoCopy,
      password: await (await hashedPasswords()).userTwoHashedPassord,
    },
  });
  await prisma.sellerInfo.create({
    data: sellerInfo,
  });
  await prisma.user.create({
    data: {
      ...userThreeCopy,
      password: await (await hashedPasswords()).userThreeHashedPassord,
    },
  });

  await prisma.category.create({
    data: categoryOne,
  });

  await prisma.category.create({
    data: categoryTwo,
  });

  await prisma.product.create({
    data: productOne,
  });
  await prisma.product.create({
    data: productTwo,
  });

  await prisma.productReview.create({
    data: productReview,
  });

  await prisma.sellerReport.create({
    data: sellerReport,
  });

  await prisma.conversation.create({
    data: conversation,
  });

  await prisma.message.create({
    data: message,
  });
};

module.exports = {
  setUpDatabase,
  userOne,
  userTwo,
  userThree,
  categoryOne,
  productOne,
  productTwo,
  categoryTwo,
  productReview,
  sellerReport,
  conversation,
  message,
};
