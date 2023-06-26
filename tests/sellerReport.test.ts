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
  sellerReport,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should allow a user to create a report', async () => {
  // Assert that a 201 status code
  const response = await request(app)
    .post('/api/sellerReports')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      sellerId: userTwo.id,
      message: 'This is a good seller',
    });
  expect(response.status).toBe(201);
});

test('should not allow an admin to create a report', async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .post('/api/sellerReports')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      sellerId: userTwo.id,
      message: 'This is a good seller',
    });
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to create a report', async () => {
  // Assert that a 401 status code
  const response = await request(app).post('/api/sellerReports').send({
    sellerId: userTwo.id,
    message: 'This is a good seller',
  });
  expect(response.status).toBe(401);
});

test('should allow an admin to delete a product report', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .delete(`/api/sellerReports/adminDelete/${sellerReport.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).toBe(null);
});

test('should not allow a simple user to delete a product report using the admin route', async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/sellerReports/adminDelete/${sellerReport.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).not.toBe(null);
});

test('should not allow an unauthenticated to delete a report using the admin route', async () => {
  // Assert that a 401 status code
  const response = await request(app)
    .delete(`/api/sellerReports/adminDelete/${sellerReport.id}`)
    .send();
  expect(response.status).toBe(401);
});

test('should allow a user to delete his/her report', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .delete(`/api/sellerReports/${sellerReport.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).toBe(null);
});

test("should not allow a random user to delete another user's report", async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/sellerReports/${sellerReport.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).not.toBe(null);
});

test("should not allow an admin to delete another user's report using the user's delete route", async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .delete(`/api/sellerReports/${sellerReport.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).not.toBe(null);
});

test('should not allow an unauthenticated user to delete a review', async () => {
  // Assert that a 401 status code
  const response = await request(app)
    .delete(`/api/sellerReports/${sellerReport.id}`)
    .send();
  expect(response.status).toBe(401);

  // Assert that the report does not exist in the database.
  const report = await prisma.sellerReport.findUnique({
    where: {
      id: sellerReport.id,
    },
  });
  expect(report).not.toBe(null);
});
