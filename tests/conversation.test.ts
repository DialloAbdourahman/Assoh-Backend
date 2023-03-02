import { Prisma, PrismaClient } from '@prisma/client';
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
  conversation,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should allow a buyer to create a new conversation', async () => {
  // Assert that a 201 status code is returned.
  const response = await request(app)
    .post(`/api/conversations/${userTwo.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(201);

  // Assert that the conversation exist in the database.
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: response.body.id,
    },
  });
  expect(conversation?.id).toBe(response.body.id);
});

test('should not allow a seller to create a new conversation', async () => {
  // Assert that a 400 status code is returned.
  const response = await request(app)
    .post(`/api/conversations/${userThree.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an admin to create a new conversation', async () => {
  // Assert that a 400 status code is returned.
  const response = await request(app)
    .post(`/api/conversations/${userThree.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to create a new conversation', async () => {
  // Assert that a 401 status code is returned.
  const response = await request(app)
    .post(`/api/conversations/${userThree.id}`)
    .send();
  expect(response.status).toBe(401);
});

test("should see all my conversation (buyer's side)", async () => {
  // Assert that a 200 status code is returned.
  const response = await request(app)
    .get(`/api/conversations`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the conversation matches
  expect(response.body[0].id).toBe(conversation.id);
});

test("should see all my conversation (seller's side)", async () => {
  // Assert that a 200 status code is returned.
  const response = await request(app)
    .get(`/api/conversations`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the conversation matches
  expect(response.body[0].id).toBe(conversation.id);
});

test('should not allow unauthenticated user to see all conversations', async () => {
  // Assert that a 401 status code is returned.
  const response = await request(app).get(`/api/conversations`).send();
  expect(response.status).toBe(401);
});

test('should get a specific conversation', async () => {
  // Assert that a 200 status code is returned.
  const response = await request(app)
    .get(`/api/conversations/${userTwo.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the conversation matches
  expect(response.body.id).toBe(conversation.id);
});

test('should not get a specific conversation of an unauthenticated user', async () => {
  // Assert that a 401 status code is returned.
  const response = await request(app)
    .get(`/api/conversations/${userTwo.id}`)
    .send();
  expect(response.status).toBe(401);
});
