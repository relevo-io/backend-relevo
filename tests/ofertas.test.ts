import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_OWNER, TEST_USER } from './setup.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';

describe('Ofertas API', () => {
  let ownerToken: string;
  let userToken: string;
  let ownerId: string;

  beforeEach(async () => {
    // Login as Owner
    const ownerLogin = await request(app).post('/api/auth/login').send({
      email: TEST_OWNER.email,
      password: TEST_OWNER.password
    });
    ownerToken = ownerLogin.body.accessToken;

    // Login as Regular User
    const userLogin = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    userToken = userLogin.body.accessToken;

    // Get Owner ID
    const owner = await UsuarioModel.findOne({ email: TEST_OWNER.email });
    ownerId = owner!._id.toString();
  });

  it('should allow an OWNER to create an offer', async () => {
    const response = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Catalonia',
      sector: 'Technology',
      revenueRange: 'BETWEEN_100K_500K',
      owner: ownerId,
      creationYear: 2020,
      employeeRange: '11_25',
      companyDescription: 'Innovative startup in the tech sector',
      extendedDescription: 'Detailed project projections for 2026'
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('region', 'Catalonia');
  });

  it('should deny an INTERESTED user from creating an offer', async () => {
    const response = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${userToken}`).send({
      region: 'Madrid',
      sector: 'Hospitality',
      owner: ownerId,
      companyDescription: 'Nice restaurant'
    });

    expect(response.status).toBe(403);
  });

  it('should list all offers (public)', async () => {
    const response = await request(app).get('/api/ofertas');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should allow owner to update their offer', async () => {
    // Create an offer first
    const newOferta = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Valencia',
      sector: 'Agriculture',
      owner: ownerId,
      companyDescription: 'Orange farm'
    });

    const id = newOferta.body._id;

    const response = await request(app).put(`/api/ofertas/${id}`).set('Authorization', `Bearer ${ownerToken}`).send({
      sector: 'Sustainable Agriculture'
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('sector', 'Sustainable Agriculture');
  });

  it('should deny another user from deleting an offer they do not own', async () => {
    // Create an offer first
    const newOferta = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Galicia',
      sector: 'Fishing',
      owner: ownerId,
      companyDescription: 'Fishing company'
    });

    const id = newOferta.body._id;

    const response = await request(app).delete(`/api/ofertas/${id}`).set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});
