import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { UsuarioModel, IUsuario } from '../src/models/usuarioModel.js';

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/ea-exercise-mongoose-test';

export const TEST_ADMIN: IUsuario = {
  fullName: 'Test Admin',
  email: 'admin@test.com',
  password: 'password123',
  roles: ['ADMIN'],
  location: 'Barcelona',
  language: 'es',
  visible: true
};

export const TEST_USER: IUsuario = {
  fullName: 'Test User',
  email: 'user@test.com',
  password: 'password123',
  roles: ['INTERESTED'],
  location: 'Barcelona',
  language: 'es',
  visible: true
};

export const TEST_OWNER: IUsuario = {
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
