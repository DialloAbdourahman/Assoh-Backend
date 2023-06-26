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
  userThree,
  categoryOne,
  categoryTwo,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should allow an admin to create a category', async () => {
  // Assert that a 201 status code
  const response = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'Dressinggggg',
      description: 'This is a good description.',
    });
  expect(response.status).toBe(201);

  // Assert that the category exist in the database
  const category: Category | any = await prisma.category.findUnique({
    where: {
      id: response.body.id,
    },
  });
  expect(category.name).toBe('Dressinggggg');
});

test('should not allow a non admin to create a category', async () => {
  // Assert that a 400 status code
  const response = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      name: 'Dressinggggg',
      description: 'This is a good description.',
    });
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to create a category', async () => {
  // Assert that a 400 status code
  const response = await request(app).post('/api/categories').send({
    name: 'Dressinggggg',
    description: 'This is a good description.',
  });
  expect(response.status).toBe(401);
});

test('should any user to see all categories', async () => {
  // Assert that a 200 status code
  const response = await request(app).get('/api/categories').send();
  expect(response.status).toBe(200);

  // Assert that the category matches the one existing in the database.
  expect(response.body[0].name).toBe(categoryOne.name);
});

test('should allow an admin to update a category.', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .patch(`/api/categories/${categoryOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'Mangaaaa',
    });
  expect(response.status).toBe(200);

  // Assert that the category matches the one existing in the database.
  expect(response.body.name).toBe('Mangaaaa');
});

test('should not allow a non admin to update a category.', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .patch(`/api/categories/${categoryOne.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      name: 'Mangaaaa',
    });
  expect(response.status).toBe(400);

  // Assert that the category matches the one existing in the database.
  expect(response.body.name).not.toBe('Mangaaaa');
});

test('should not allow an unauthenticated user to update a category', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .patch(`/api/categories/${categoryOne.id}`)
    .send({
      name: 'Mangaaaa',
    });
  expect(response.status).toBe(401);
});

test('should allow an admin to delete a category that is not already used.', async () => {
  // Assert that a 200 status code
  const response = await request(app)
    .delete(`/api/categories/${categoryTwo.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);
});

test('should not allow an unauthenticated user to delete a category.', async () => {
  // Assert that a 401 status code
  const response = await request(app)
    .delete(`/api/categories/${categoryTwo.id}`)
    .send();
  expect(response.status).toBe(401);
});

test('should allow and admin to upload a category image and delete it.', async () => {
  // jest.setTimeout(10000)

  // Assert that a 200 status code
  const response = await request(app)
    .post(`/api/categories/uploadImage/${categoryOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .attach('image', 'tests/fixtures/image2.jpg');
  expect(response.status).toBe(200);

  // Assert that the imageUrl is not null
  expect(response.body.updatedCategory.imageUrl).not.toBe(null);

  // Assert that a 200 status code is returned after deleting an image.
  const response2 = await request(app)
    .delete(`/api/categories/deleteImage/${categoryOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`);
  expect(response2.status).toBe(200);
});
