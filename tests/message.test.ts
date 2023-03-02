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
  message,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should allow a buyer to send a message with a specific conversationID', async () => {
  // Assert that a 201 status code is returned.
  const response = await request(app)
    .post(`/api/messages`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      text: 'Goodmorning seller',
      conversationId: conversation.id,
    });
  expect(response.status).toBe(201);

  // Assert that the message exist in the database.
  const message = await prisma.message.findUnique({
    where: {
      id: response.body.id,
    },
  });
  expect(message?.id).toBe(response.body.id);
});

test('should allow a seller to send a message with a specific conversationID', async () => {
  // Assert that a 201 status code is returned.
  const response = await request(app)
    .post(`/api/messages`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      text: 'Goodmorning seller',
      conversationId: conversation.id,
    });
  expect(response.status).toBe(201);

  // Assert that the message exist in the database.
  const message = await prisma.message.findUnique({
    where: {
      id: response.body.id,
    },
  });
  expect(message?.id).toBe(response.body.id);
});

test('should not create a message with an inexisting conversation ID', async () => {
  // Assert that a 500 status code is returned.
  const response = await request(app)
    .post(`/api/messages`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      text: 'Goodmorning seller',
      conversationId: 'conversation.id',
    });
  expect(response.status).toBe(500);
});

test('should not create a message for an unauthenticated user', async () => {
  // Assert that a 401 status code is returned.
  const response = await request(app).post(`/api/messages`).send({
    text: 'Goodmorning seller',
    conversationId: 'conversation.id',
  });
  expect(response.status).toBe(401);
});

test('should see all messages of a specific conversation', async () => {
  // Assert that a 200 status code is returned.
  const response = await request(app)
    .get(`/api/messages/${conversation.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Make sure that the recieved messages matches with the one in the database.
  expect(response.body[0].id).toBe(message.id);
});

test('should not see messages of an inexisting conversation', async () => {
  // Assert that a 400 status code is returned.
  const response = await request(app)
    .get(`/api/messages/8896565`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to use this route', async () => {
  // Assert that a 401 status code is returned.
  const response = await request(app)
    .get(`/api/messages/${conversation.id}`)
    .send();
  expect(response.status).toBe(401);
});
