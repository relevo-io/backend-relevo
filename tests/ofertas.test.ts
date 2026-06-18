import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_ADMIN, TEST_OWNER, TEST_USER } from './setup.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';
import { OfertaModel } from '../src/models/ofertaModel.js';
import { SolicitudModel } from '../src/models/solicitudModel.js';

describe('Ofertas API', () => {
  let ownerToken: string;
  let userToken: string;
  let adminToken: string;
  let ownerId: string;
  let userId: string;

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

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password
    });
    adminToken = adminLogin.body.accessToken;

    // Get Owner ID
    const owner = await UsuarioModel.findOne({ email: TEST_OWNER.email });
    ownerId = owner!._id.toString();
    const user = await UsuarioModel.findOne({ email: TEST_USER.email });
    userId = user!._id.toString();
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

  it('should increment detail views for valid openings and not for owner or admin', async () => {
    const oferta = await OfertaModel.create({
      region: 'Sevilla',
      sector: 'Retail',
      owner: ownerId,
      companyDescription: 'Local shop'
    });

    const publicView = await request(app).post(`/api/ofertas/${oferta._id}/view`);
    expect(publicView.status).toBe(200);
    expect(publicView.body.detailViewCount).toBe(1);

    const ownerView = await request(app)
      .post(`/api/ofertas/${oferta._id}/view`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.detailViewCount).toBe(1);

    const adminView = await request(app)
      .post(`/api/ofertas/${oferta._id}/view`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.status).toBe(200);
    expect(adminView.body.detailViewCount).toBe(1);
  });

  it('should return zero counters for legacy offers without manual migration', async () => {
    const oferta = await OfertaModel.collection.insertOne({
      region: 'Bilbao',
      sector: 'Industrial',
      owner: ownerId,
      companyDescription: 'Legacy business'
    });

    const response = await request(app).get(`/api/ofertas/${oferta.insertedId}`);
    expect(response.status).toBe(200);
    expect(response.body.detailViewCount).toBe(0);
    expect(response.body.favoriteCount).toBe(0);
  });

  it('should aggregate favorites, requests and status analytics for the owner', async () => {
    const oferta = await OfertaModel.create({
      region: 'Malaga',
      sector: 'Tourism',
      owner: ownerId,
      detailViewCount: 4,
      companyDescription: 'Boutique hotel'
    });

    await UsuarioModel.findByIdAndUpdate(userId, { $addToSet: { favoriteOfferIds: oferta._id } });
    await SolicitudModel.create({
      owner: ownerId,
      interestedUser: userId,
      opportunity: oferta._id,
      status: 'ACCEPTED',
      bio: 'Experienced operator',
      professionalBackground: 'Hospitality manager',
      availableCapital: 100000,
      financingNeeded: false,
      ndaAccepted: true
    });

    const response = await request(app)
      .get(`/api/ofertas/${oferta._id}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      detailViewCount: 4,
      favoriteCount: 1,
      requestCount: 1,
      requestConversionRate: 25,
      requestsByStatus: {
        pending: 0,
        accepted: 1,
        rejected: 0
      }
    });
  });

  it('should only allow the owner or an admin to access private analytics', async () => {
    const oferta = await OfertaModel.create({
      region: 'Girona',
      sector: 'Food',
      owner: ownerId,
      companyDescription: 'Bakery'
    });

    const forbidden = await request(app)
      .get(`/api/ofertas/${oferta._id}/analytics`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/ofertas/${oferta._id}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
  });

  it('should return zero conversion when there are no detail views', async () => {
    const oferta = await OfertaModel.create({
      region: 'Toledo',
      sector: 'Services',
      owner: ownerId,
      companyDescription: 'Cleaning company'
    });

    await SolicitudModel.create({
      owner: ownerId,
      interestedUser: userId,
      opportunity: oferta._id,
      status: 'PENDING',
      bio: 'Interested buyer',
      professionalBackground: 'Operations profile',
      availableCapital: 25000,
      financingNeeded: true,
      ndaAccepted: true
    });

    const response = await request(app)
      .get(`/api/ofertas/${oferta._id}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.requestConversionRate).toBe(0);
  });
});
