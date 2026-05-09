import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_ADMIN, TEST_USER } from './setup.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';

describe('User Management (Admin & Self)', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    // Login as Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password
    });
    adminToken = adminLogin.body.accessToken;

    // Login as Regular User
    const userLogin = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    userToken = userLogin.body.accessToken;

    // Get User ID
    const user = await UsuarioModel.findOne({ email: TEST_USER.email });
    userId = user!._id.toString();
  });

  it('should allow admin to list all users', async () => {
    const response = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should deny non-admin from listing all users', async () => {
    const response = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });

  it('should allow user to get their own profile by ID', async () => {
    const response = await request(app).get(`/api/usuarios/${userId}`).set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', TEST_USER.email);
  });
});
