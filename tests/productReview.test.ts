import { Category, Prisma, PrismaClient } from '@prisma/client';
const prisma: PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
> = require('../utiles/prismaClient');
const app = require('../src/app');
const request = require('supertest');
const {
  setUpDatabase,
  userOne,
  userTwo,
  userThree,
  productOne,
  productReview,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should allow a user to create a review', async () => {
  // Assert that a 201 status code
  const response = await request(app)
    .post('/api/productReviews')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      rating: 4,
      comment: 'This is a good product',
      productId: productOne.id,
    });
  expect(response.status).toBe(201);

  // Assert that the category exist in the database
  const review = await prisma.productReview.findUnique({
    where: {
      id: response.body.productReview.id,
    },
  });
  expect(review?.comment).toBe('This is a good product');
});

test('should not allow an admin to create a review', async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .post('/api/productReviews')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      rating: 4,
      comment: 'This is a good product',
      productId: productOne.id,
    });
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to create a review', async () => {
  // Assert that a 401 status code
  const response = await request(app).post('/api/productReviews').send({
    rating: 4,
    comment: 'This is a good product',
    productId: productOne.id,
  });
  expect(response.status).toBe(401);
});

test('should allow an admin to delete a product review', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .delete(`/api/productReviews/adminDelete/${productReview.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).toBe(null);
});

test('should not allow a simple user to delete a product review using the admin route', async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/productReviews/adminDelete/${productReview.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).not.toBe(null);
});

test('should not allow an unauthenticated to delete a product review using the admin route', async () => {
  // Assert that a 401 status code
  const response = await request(app)
    .delete(`/api/productReviews/adminDelete/${productReview.id}`)
    .send();
  expect(response.status).toBe(401);
});

test('should allow a user to delete his/her review', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .delete(`/api/productReviews/${productReview.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).toBe(null);
});

test("should not allow a random user to delete another user's review", async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/productReviews/${productReview.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).not.toBe(null);
});

test("should not allow an admin to delete another user's review using the user's delete route", async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/productReviews/${productReview.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).not.toBe(null);
});

test('should not allow an unauthenticated user to delete a review', async () => {
  // Assert that a 401 status code
  const response = await request(app)
    .delete(`/api/productReviews/${productReview.id}`)
    .send();
  expect(response.status).toBe(401);

  // Assert that the review does not exist in the database.
  const review = await prisma.productReview.findUnique({
    where: {
      id: productReview.id,
    },
  });
  expect(review).not.toBe(null);
});
