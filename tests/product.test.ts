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
  categoryOne,
  productOne,
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should create a product for an authenticated user', async () => {
  // Assert that a 201 status code is returned after creating a product
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      name: 'Test',
      description: 'Test description',
      price: 30000,
      quantity: 5,
      categoryId: categoryOne.id,
    });
  expect(response.status).toBe(201);

  // Assert that the product exist in the database
  const product = await prisma.product.findUnique({
    where: {
      id: response.body.id,
    },
  });
  expect(product).toMatchObject({ id: response.body.id });
});

test('should not create a product for an unauthenticated user', async () => {
  // Assert that a 201 status code is returned after creating a product
  const response = await request(app).post('/api/products').send({
    name: 'Test',
    description: 'Test description',
    price: 30000,
    quantity: 5,
    categoryId: categoryOne.id,
  });
  expect(response.status).toBe(401);
});

test('should not create a product for a non seller.', async () => {
  // Assert that a 201 status code is returned after creating a product
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'Test',
      description: 'Test description',
      price: 30000,
      quantity: 5,
      categoryId: categoryOne.id,
    });
  expect(response.status).toBe(400);
});

test('should view a product using an id', async () => {
  // Assert that a 200 status code is returned after looking for a product using and id
  const response = await request(app)
    .get(`/api/products/${productOne.id}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the productId matches
  expect(response.body.id).toBe(productOne.id);
});

test('should allow a seller who created a product to delete it', async () => {
  // Just some sample images
  const res = await request(app)
    .post(`/api/products/images/${productOne.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .attach('images', 'tests/fixtures/image2.jpg');
  expect(res.status).toBe(200);

  // Assert that a 200 status code is returned after deleting a product
  const response = await request(app)
    .delete(`/api/products/${productOne.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the product has been deleted from the database
  const product = await prisma.product.findUnique({
    where: {
      id: productOne.id,
    },
  });
  expect(product).toBe(null);
});

test('should not allow an unauthorized user to delete a product', async () => {
  // Assert that a 401 status code is returned after trying to delete a product
  const response = await request(app)
    .delete(`/api/products/${productOne.id}`)
    .send();
  expect(response.status).toBe(401);

  // Assert that the product has not been deleted from the database
  const product = await prisma.product.findUnique({
    where: {
      id: productOne.id,
    },
  });
  expect(product?.id).toBe(productOne.id);
});

test('should not allow a user to delete a product he/she has not created', async () => {
  // Assert that a 200 status code is returned after deleting a product
  const response = await request(app)
    .delete(`/api/products/${productOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the product has not been deleted from the database
  const product = await prisma.product.findUnique({
    where: {
      id: productOne.id,
    },
  });
  expect(product?.id).toBe(productOne.id);
});

test('should allow a seller to view all the product he/she has created', async () => {
  // Assert that a 200 status code is returned
  const response = await request(app)
    .get(`/api/products/myProducts`)
    .query({ page: 1, name: 'fullmetal' })
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that we have an array with the correct lenght
  expect(response.body[0].id).toBe(productOne.id);
});

test('should not allow a seller to view all his/her product without being authenticated', async () => {
  // Assert that a 401 status code is returned
  const response = await request(app)
    .get(`/api/products/myProducts`)
    .query({ page: 1, name: 'fullmetal' })
    .send();
  expect(response.status).toBe(401);
});

test('should allow any user to view all the products available', async () => {
  // Assert that a 200 status code is returned
  const response = await request(app)
    .get(`/api/products`)
    .query({ page: 1, name: '' })
    .send();
  expect(response.status).toBe(200);

  // Assert that the returned products matches with those is the database
  const products = await prisma.product.findMany({});
  expect(response.body.length).toBe(products.length);
});

test('should allow a seller to update a product he/she has created', async () => {
  // Assert that a 200 status code is returned after the product has been updated
  const response = await request(app)
    .patch(`/api/products/${productOne.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      name: 'FMA',
    });
  expect(response.status).toBe(200);

  // Assert that the updated product contains the updated data
  expect(response.body.name).toBe('FMA');
});

test('should not allow an admin to update a product someone else created.', async () => {
  // Assert that a 400 status code is returned after the product has been updated
  const response = await request(app)
    .patch(`/api/products/${productOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'FMA',
    });
  expect(response.status).toBe(400);
});

test('should not allow a buyer to update a product someone else created.', async () => {
  // Assert that a 400 status code is returned after the product has been updated
  const response = await request(app)
    .patch(`/api/products/${productOne.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      name: 'FMA',
    });
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to update a product someone else created.', async () => {
  // Assert that a 400 status code is returned after the product has been updated
  const response = await request(app)
    .patch(`/api/products/${productOne.id}`)
    .send({
      name: 'FMA',
    });
  expect(response.status).toBe(401);
});

test('should allow a seller to upload product image and delete it', async () => {
  // Assert that a 200 status code is returned after uploading images.
  const response = await request(app)
    .post(`/api/products/images/${productOne.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .attach('images', 'tests/fixtures/image2.jpg');
  expect(response.status).toBe(200);

  // Assert that the product has been deleted
  const response2 = await request(app)
    .delete(`/api/products/deleteImage`)
    .query({ image: response.body[0].split(' ')[0], id: productOne.id })
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response2.status).toBe(200);
});

test('should not allow an unauthorized seller to upload product image', async () => {
  // Assert that a 400 status code is returned after trying to upload an image.
  const response = await request(app)
    .post(`/api/products/images/${productOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .attach('images', 'tests/fixtures/image2.jpg');
  expect(response.status).toBe(400);
});

test("should not allow an unauthorized user to delete another seller's product image", async () => {
  // Assert that a 400 status code is returned after trying to upload an image.
  const response = await request(app)
    .delete(`/api/products/deleteImage`)
    .query({ image: 'test', id: 'test' })
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);
});

test("should not allow an unauthenticated user to delete another seller's product image", async () => {
  // Assert that a 401 status code is returned after trying to upload an image.
  const response = await request(app)
    .delete(`/api/products/deleteImage`)
    .query({ image: 'test', id: 'test' })
    .send();
  expect(response.status).toBe(401);
});

test("should allow an admin to delete a product using it's id", async () => {
  // Just some sample images
  const res = await request(app)
    .post(`/api/products/images/${productOne.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .attach('images', 'tests/fixtures/image2.jpg');
  expect(res.status).toBe(200);

  // Assert that a 200 status code is returned after deleting a product
  const response = await request(app)
    .delete(`/api/products/adminDeleteProduct/${productOne.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the product has been deleted from the database
  const product = await prisma.product.findUnique({
    where: {
      id: productOne.id,
    },
  });
  expect(product).toBe(null);
});

test('should not allow a non admin to use the admin route in order to delete a product', async () => {
  // Assert that a 400 status code is returned after deleting a product
  const response = await request(app)
    .delete(`/api/products/adminDeleteProduct/${productOne.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an unauthenticated user to use the admin route in order to delete a product', async () => {
  // Assert that a 400 status code is returned after deleting a product
  const response = await request(app)
    .delete(`/api/products/adminDeleteProduct/${productOne.id}`)
    .send();
  expect(response.status).toBe(401);
});
