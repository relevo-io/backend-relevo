import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { UsuarioModel } from '../src/models/usuarioModel.js';

// Use a separate database for testing
const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ea-exercise-mongoose-test';

export const TEST_ADMIN = {
  fullName: 'Test Admin',
  email: 'admin@test.com',
  password: 'password123',
  roles: ['ADMIN'],
  location: 'Barcelona',
  language: 'es',
  visible: true,
  extendedDescription: 'Admin user for testing'
};

export const TEST_USER = {
  fullName: 'Test User',
  email: 'user@test.com',
  password: 'password123',
  roles: ['INTERESTED'],
  location: 'Barcelona',
  language: 'es',
  visible: true,
  extendedDescription: 'Regular user for testing'
};

export const TEST_OWNER = {
  fullName: 'Test Owner',
  email: 'owner@test.com',
  password: 'password123',
  roles: ['OWNER'],
  location: 'Madrid',
  language: 'en',
  visible: true
};

beforeAll(async () => {
  // Ensure we are connected to the test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
}, 15000);

beforeEach(async () => {
  // Clear all collections before each test to ensure isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Hardcode test users
  await UsuarioModel.create(TEST_ADMIN);
  await UsuarioModel.create(TEST_USER);
  await UsuarioModel.create(TEST_OWNER);
});

afterAll(async () => {
  // Disconnect after all tests are finished
  await mongoose.disconnect();
}, 15000);
