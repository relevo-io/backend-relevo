import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_USER } from './setup.js';

describe('Auth & User Registration Flow', () => {
  const newTestUser = {
    fullName: 'New User',
    email: 'newuser@example.com',
    password: 'password123',
    roles: ['INTERESTED'],
    location: 'Valencia',
    language: 'ca'
  };

  it('should register a new user and assign both OWNER and INTERESTED roles', async () => {
    const response = await request(app).post('/api/usuarios').send(newTestUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('email', newTestUser.email);
    expect(response.body.roles).toEqual(['OWNER', 'INTERESTED']);
  });

  it('should register a new user and ignore single OWNER request, assigning both roles', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .send({
        fullName: 'Owner User',
        email: 'owneruser@example.com',
        password: 'password123',
        roles: ['OWNER'],
        location: 'Valencia'
      });

    expect(response.status).toBe(201);
    expect(response.body.roles).toEqual(['OWNER', 'INTERESTED']);
  });

  it('should register a new user with both roles directly', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .send({
        fullName: 'Dual User',
        email: 'dualuser@example.com',
        password: 'password123',
        roles: ['OWNER', 'INTERESTED'],
        location: 'Valencia'
      });

    expect(response.status).toBe(201);
    expect(response.body.roles).toEqual(['OWNER', 'INTERESTED']);
  });

  it('should reject registration if roles contains ADMIN', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .send({
        fullName: 'Malicious Admin Attempt',
        email: 'adminattempt@example.com',
        password: 'password123',
        roles: ['ADMIN'],
        location: 'Valencia'
      });

    expect(response.status).toBe(400);
  });

  it('should reject registration if roles is empty', async () => {
    const response = await request(app).post('/api/usuarios').send({
      fullName: 'Empty Roles Attempt',
      email: 'emptyattempt@example.com',
      password: 'password123',
      roles: [],
      location: 'Valencia'
    });

    expect(response.status).toBe(400);
  });

  it('should login with the seeded test user', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.usuario).toHaveProperty('language');
    expect(response.body.usuario).toHaveProperty('theme');
  });

  it('should get the profile of the authenticated user', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    const token = loginRes.body.accessToken;

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', TEST_USER.email);
  });

  it('should fail to login with wrong credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: 'wrongpassword'
    });

    expect(response.status).toBe(401);
  });
});
