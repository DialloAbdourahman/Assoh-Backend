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
} = require('./fixtures/initialSetup');

beforeEach(setUpDatabase);

test('should create new user', async () => {
  // Assert that a 201 status code is returned after creating an assoh
  const response = await request(app).post('/api/users').send({
    name: 'Diallo Souleyman',
    email: 'diallisouleyman78@gmail.com',
    password: 'diallo1234',
  });
  expect(response.status).toBe(201);

  // Assert that the database was changed correctly.
  const user = await prisma.user.findUnique({
    where: {
      email: response.body.email,
    },
  });
  expect(user).not.toBe(null);

  // Assertions about the response body
  expect(response.body).toMatchObject({
    name: 'Diallo Souleyman',
    email: 'diallisouleyman78@gmail.com',
    role: 'buyer',
  });

  // Assert that the plain text password has not been stored in the database
  expect(response.body.assohPassword).not.toBe('diallo1234');
});

test('should not create user with invalid credentials', async () => {
  // Missing email field which is mandatory.
  const response = await request(app).post('/api/users').send({
    name: 'Diallo Souleyman',
    email: 'diallisouleyman78@gmail.com',
  });
  expect(response.status).toBe(400);
});

test('should login existing user', async () => {
  const response = await request(app).post('/api/users/login').send({
    email: userTwo.email,
    password: userTwo.password,
  });
  expect(response.status).toBe(200);

  // Assert that the token is correct
  const user = await prisma.user.findUnique({
    where: {
      id: userTwo.id,
    },
  });
  expect(user?.tokens[1]).toBe(response.body.token);
});

test('should not login inexisting user', async () => {
  const response = await request(app).post('/api/users/login').send({
    email: 'test@gmail.com',
    password: 'test1234',
  });
  expect(response.status).toBe(400);
});

test('should log out authenticated user', async () => {
  const response = await request(app)
    .post('/api/users/logout')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the token array is empty.
  const user = await prisma.user.findUnique({
    where: {
      id: userOne.id,
    },
  });
  expect(user?.tokens.length).toBe(0);
});

test('should not log out unauthenticated user', async () => {
  const response = await request(app).post('/api/users/logout').send();

  expect(response.status).toBe(401);
});

test('should delete authenticated assoh', async () => {
  // Just an initial avatar
  const avatar = await request(app)
    .post(`/api/users/avatarUpload`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .attach('avatar', 'tests/fixtures/image2.jpg');

  const response = await request(app)
    .delete('/api/users')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Asset that the assoh has been deleted from the database.
  const deletedUser = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(deletedUser).toBe(null);
});

test('should not delete account of an unauthorzed assoh', async () => {
  const response = await request(app).delete('/api/users').send();
  expect(response.status).toBe(401);
});

test("should update a buyer's information using the buyer's update route", async () => {
  const response = await request(app)
    .patch('/api/users')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      name: 'Reiner the boss',
    });
  expect(response.status).toBe(200);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user).toMatchObject({
    name: 'Reiner the boss',
  });
});

test("should update an admin's information using the buyer's update route", async () => {
  const response = await request(app)
    .patch('/api/users')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'Diallo the boss',
    });
  expect(response.status).toBe(200);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userOne.id,
    },
  });
  expect(user).toMatchObject({
    name: 'Diallo the boss',
  });
});

test("should not update a buyer's information using the buyer's update route if unauthorized", async () => {
  const response = await request(app).patch('/api/users').send({
    name: 'Reiner the boss',
  });
  expect(response.status).toBe(401);
});

test("should not update a buyer's invalid information using the buyer's update route", async () => {
  const response = await request(app)
    .patch('/api/users')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      test: 'test',
    });
  expect(response.status).toBe(400);
});

test("should not allow a seller to update his/her information using the buyer's update route.", async () => {
  const response = await request(app)
    .patch('/api/users')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      name: 'Eren the boss',
    });
  expect(response.status).toBe(400);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userTwo.id,
    },
  });
  expect(user).not.toMatchObject({
    name: 'Eren the boss',
  });
});

test("should update a seller's information using the seller's update route", async () => {
  const response = await request(app)
    .patch('/api/users/sellerUpdate')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
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
    });
  expect(response.status).toBe(200);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userTwo.id,
    },
    include: {
      sellerInfo: true,
    },
  });
  expect(user?.sellerInfo).toMatchObject({
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
  });
});

test("should not update a seller's information using the seller's update route if unauthorized", async () => {
  const response = await request(app).patch('/api/users/sellerUpdate').send({
    name: 'Reiner the boss',
  });
  expect(response.status).toBe(401);
});

test("should not update a seller's invalid information using the seller's update route", async () => {
  const response = await request(app)
    .patch('/api/users/sellerUpdate')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send({
      test: 'test',
    });
  expect(response.status).toBe(400);
});

test("should not allow a buyer to update his/her information using the seller's update route.", async () => {
  const response = await request(app)
    .patch('/api/users/sellerUpdate')
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send({
      name: 'Reiner the boss',
    });
  expect(response.status).toBe(400);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user).not.toMatchObject({
    name: 'Reiner the boss',
  });
});

test("should not allow an admin to update his/her information using the seller's update route.", async () => {
  const response = await request(app)
    .patch('/api/users/sellerUpdate')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send({
      name: 'Reiner the boss',
    });
  expect(response.status).toBe(400);

  // Assert that the changes has been made in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userOne.id,
    },
  });
  expect(user).not.toMatchObject({
    name: 'Reiner the boss',
  });
});

test('should search for sellers', async () => {
  const response = await request(app)
    .get('/api/users/sellers')
    .query({
      name: 'Eren',
      page: 1,
    })
    .send();
  expect(response.status).toBe(200);

  // Assert that the data matches
  expect(response.body[0].name).toBe(userTwo.name);
});

test('should search for a seller using his/her id', async () => {
  const response = await request(app).get(`/api/users/${userTwo.id}`).send();
  expect(response.status).toBe(200);

  // Assert that the data matches
  expect(response.body.name).toBe(userTwo.name);
});

test('should not search for a buyer/admin using the search seller route', async () => {
  const response = await request(app).get(`/api/users/${userThree.id}`).send();
  expect(response.status).toBe(400);
});

test('should allow an admin to search for any kind of user', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .query({
      name: '',
      page: 1,
      role: 'buyer',
    })
    .send();
  expect(response.status).toBe(200);

  // Assert that the data matches
  expect(response.body[0].name).toBe(userThree.name);
});

test('should not allow a non admin to search for any kind of user', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .query({
      name: '',
      page: 1,
      role: 'buyer',
    })
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an unauthorized to search for any kind of user using the admin route', async () => {
  const response = await request(app)
    .get('/api/users')
    .query({
      name: '',
      page: 1,
      role: 'buyer',
    })
    .send();
  expect(response.status).toBe(401);
});

test('should allow an admin user to delete a user', async () => {
  // Just an initial avatar
  const avatar = await request(app)
    .post(`/api/users/avatarUpload`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .attach('avatar', 'tests/fixtures/image2.jpg');

  // Assert that a status of 200 is returned after deleteing an user
  const response = await request(app)
    .delete(`/api/users/adminDelete/${userThree.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .send();
  expect(response.status).toBe(200);

  // Assert that the user is not in the database
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user).toBe(null);
});

test('should not allow a seller to delete a user', async () => {
  // Assert that a status of 400 is returned.
  const response = await request(app)
    .delete(`/api/users/adminDelete/${userThree.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the user is not in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user).not.toBe(null);
});

test('should not allow a buyer to delete a user', async () => {
  // Assert that a status of 200 is returned.
  const response = await request(app)
    .delete(`/api/users/adminDelete/${userThree.id}`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response.status).toBe(400);

  // Assert that the user is not in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user).not.toBe(null);
});

test('should allow an authorized user to upload and delete an avatar', async () => {
  // Assert that a 200 status is return after saving an image in the database.
  const response = await request(app)
    .post(`/api/users/avatarUpload`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .attach('avatar', 'tests/fixtures/image2.jpg');
  expect(response.status).toBe(200);

  // Assert that the avatarUrl is populated in the database.
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user?.avatarUrl).not.toBe(null);

  // Assert that a status of 200 is returned after the avatar has been deleted.
  const response2 = await request(app)
    .delete(`/api/users/deleteAvatar`)
    .set('Authorization', `Bearer ${userThree.tokens[0]}`)
    .send();
  expect(response2.status).toBe(200);

  // Assert that the avatarUrl is populated in the database.
  const user2 = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
  });
  expect(user2?.avatarUrl).toBe(null);
});

test('should not allow unauthorized upload an avatar.', async () => {
  // Assert that a 401 status is return after saving an image in the database.
  const response = await request(app)
    .post(`/api/users/avatarUpload`)
    .attach('avatar', 'tests/fixtures/image2.jpg');
  expect(response.status).toBe(401);
});

test('should allow an admin to turn a simple user (buyer) into a seller', async () => {
  // Assert that a 200 status is return after turing a buyer into a seller.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userThree.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .query({ role: 'seller' })
    .send();
  expect(response.status).toBe(200);

  // Assert that the role has been updated and the sellerInfo is not null
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
    include: { sellerInfo: true },
  });
  expect(user?.sellerInfo).not.toBe(null);
  expect(user?.roleName == 'seller');
});

test('should allow an admin to turn a simple user (buyer) into an admin', async () => {
  // Assert that a 200 status is return after turing a buyer into a admin.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userThree.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .query({ role: 'admin' })
    .send();
  expect(response.status).toBe(200);

  // Assert that the role has been updated and the sellerInfo is null
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
    include: { sellerInfo: true },
  });
  expect(user?.sellerInfo).toBe(null);
  expect(user?.roleName == 'admin');
});

test('should allow an admin to turn a seller into a buyer', async () => {
  // Assert that a 200 status is return after turing a buyer into a seller.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userTwo.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .query({ role: 'buyer' })
    .send();
  expect(response.status).toBe(200);

  // Assert that the role has been updated and the sellerInfo is null
  const user = await prisma.user.findUnique({
    where: {
      id: userThree.id,
    },
    include: { sellerInfo: true },
  });
  expect(user?.sellerInfo).toBe(null);
  expect(user?.roleName == 'buyer');
});

test('should not allow an admin to turn a user into an invalid role', async () => {
  // Assert that a 400 status is return after turing a buyer into a seller.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userTwo.id}`)
    .set('Authorization', `Bearer ${userOne.tokens[0]}`)
    .query({ role: 'buyerrrr' })
    .send();
  expect(response.status).toBe(400);
});

test('should not allow a non admin to use this route', async () => {
  // Assert that a 400 status is return after turing a buyer into a seller.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userTwo.id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0]}`)
    .query({ role: 'buyer' })
    .send();
  expect(response.status).toBe(400);
});

test('should not allow an unauthorized user to use this route', async () => {
  // Assert that a 400 status is return after turing a buyer into a seller.
  const response = await request(app)
    .post(`/api/users/adminTransform/${userTwo.id}`)
    .query({ role: 'buyer' })
    .send();
  expect(response.status).toBe(401);
});
