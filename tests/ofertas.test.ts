import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_ADMIN, TEST_OWNER, TEST_USER } from './setup.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';
import { SolicitudModel } from '../src/models/solicitudModel.js';
import { OfertaModel } from '../src/models/ofertaModel.js';
import { Types } from 'mongoose';

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

  const grantOwnerCredit = async () => {
    const response = await request(app)
      .post('/api/ofertas/publication-credit/purchase')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
  };

  it('should allow an OWNER to create an offer', async () => {
    await grantOwnerCredit();

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

  it('should hide own offers from authenticated marketplace listings', async () => {
    const ownOffer = await OfertaModel.create({
      owner: new Types.ObjectId(ownerId),
      region: 'Barcelona',
      sector: 'Technology',
      companyDescription: 'Owner marketplace offer'
    });
    const otherOffer = await OfertaModel.create({
      owner: new Types.ObjectId(userId),
      region: 'Madrid',
      sector: 'Retail',
      companyDescription: 'Another marketplace offer'
    });

    const unpaginated = await request(app).get('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`);
    const paginated = await request(app)
      .get('/api/ofertas?page=1&limit=12&search=marketplace')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(unpaginated.status).toBe(200);
    expect(unpaginated.body.map((offer: { _id: string }) => offer._id)).not.toContain(String(ownOffer._id));
    expect(unpaginated.body.map((offer: { _id: string }) => offer._id)).toContain(String(otherOffer._id));
    expect(paginated.status).toBe(200);
    expect(paginated.body.items.map((offer: { _id: string }) => offer._id)).not.toContain(String(ownOffer._id));
    expect(paginated.body.items.map((offer: { _id: string }) => offer._id)).toContain(String(otherOffer._id));
    expect(paginated.body.pagination.totalItems).toBe(1);
  });

  it('should reject requests to an offer owned by the interested user', async () => {
    await UsuarioModel.findByIdAndUpdate(ownerId, { $addToSet: { roles: 'INTERESTED' } });
    const ownerWithInterestedRole = await request(app).post('/api/auth/login').send({
      email: TEST_OWNER.email,
      password: TEST_OWNER.password
    });

    const ownOffer = await OfertaModel.create({
      owner: new Types.ObjectId(ownerId),
      region: 'Valencia',
      sector: 'Services',
      companyDescription: 'Self request prevention offer'
    });

    const response = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${ownerWithInterestedRole.body.accessToken}`)
      .send({
        opportunityId: String(ownOffer._id),
        bio: 'Owner trying to request their own offer',
        professionalBackground: 'Business owner',
        preferredRegions: ['Valencia'],
        availableCapital: 100000,
        financingNeeded: false,
        ndaAccepted: true
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('No puedes solicitar tu propia oferta');
    expect(await SolicitudModel.countDocuments({ opportunity: ownOffer._id })).toBe(0);
  });

  it('should allow owner to update their offer', async () => {
    // Create an offer first
    await grantOwnerCredit();
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
    await grantOwnerCredit();
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

  it('should increment detail views except for owner and admin', async () => {
    await grantOwnerCredit();
    const newOferta = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Sevilla',
      sector: 'Hospitality',
      owner: ownerId,
      companyDescription: 'Tapas bar with recurring clients'
    });

    const id = newOferta.body._id;

    const publicView = await request(app).post(`/api/ofertas/${id}/view`);
    const ownerView = await request(app).post(`/api/ofertas/${id}/view`).set('Authorization', `Bearer ${ownerToken}`);
    const adminView = await request(app).post(`/api/ofertas/${id}/view`).set('Authorization', `Bearer ${adminToken}`);

    expect(publicView.status).toBe(200);
    expect(ownerView.status).toBe(200);
    expect(adminView.status).toBe(200);

    const oferta = await OfertaModel.findById(id).lean();
    expect(oferta?.detailViewCount).toBe(1);
  });

  it('should persist favorites and return updated favorite counts', async () => {
    await grantOwnerCredit();
    const newOferta = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Mallorca',
      sector: 'Hospitality',
      owner: ownerId,
      companyDescription: 'Boutique hotel near the coast'
    });

    const id = newOferta.body._id;

    const addFavorite = await request(app)
      .post(`/api/ofertas/${id}/favorite`)
      .set('Authorization', `Bearer ${userToken}`);
    const favorites = await request(app).get('/api/ofertas/favorites').set('Authorization', `Bearer ${userToken}`);
    const removeFavorite = await request(app)
      .delete(`/api/ofertas/${id}/favorite`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(addFavorite.status).toBe(200);
    expect(addFavorite.body.favoriteCount).toBe(1);
    expect(favorites.status).toBe(200);
    expect(favorites.body).toHaveLength(1);
    expect(favorites.body[0]._id).toBe(id);
    expect(favorites.body[0].favoriteCount).toBe(1);
    expect(removeFavorite.status).toBe(200);
    expect(removeFavorite.body.favoriteCount).toBe(0);
  });

  it('should return private analytics for the owner', async () => {
    await grantOwnerCredit();
    const newOferta = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Bilbao',
      sector: 'Services',
      owner: ownerId,
      companyDescription: 'Maintenance services company'
    });

    const id = newOferta.body._id;
    await OfertaModel.findByIdAndUpdate(id, { detailViewCount: 4 });
    await UsuarioModel.findByIdAndUpdate(userId, { $addToSet: { favoriteOfferIds: id } });
    await SolicitudModel.create([
      {
        owner: ownerId,
        interestedUser: userId,
        opportunity: id,
        status: 'PENDING',
        bio: 'Experienced buyer',
        professionalBackground: 'Operations and sales background',
        availableCapital: 100000,
        financingNeeded: false,
        ndaAccepted: true
      },
      {
        owner: ownerId,
        interestedUser: new Types.ObjectId(),
        opportunity: id,
        status: 'ACCEPTED',
        bio: 'Experienced buyer',
        professionalBackground: 'Operations and sales background',
        availableCapital: 100000,
        financingNeeded: false,
        ndaAccepted: true
      },
      {
        owner: ownerId,
        interestedUser: new Types.ObjectId(),
        opportunity: id,
        status: 'REJECTED',
        bio: 'Experienced buyer',
        professionalBackground: 'Operations and sales background',
        availableCapital: 100000,
        financingNeeded: false,
        ndaAccepted: true
      }
    ]);

    const analytics = await request(app)
      .get(`/api/ofertas/${id}/analytics`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const forbidden = await request(app)
      .get(`/api/ofertas/${id}/analytics`)
      .set('Authorization', `Bearer ${userToken}`);
    const summary = await request(app)
      .get('/api/ofertas/me/analytics-summary')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(analytics.status).toBe(200);
    expect(analytics.body).toMatchObject({
      detailViewCount: 4,
      favoriteCount: 1,
      requestCount: 3,
      requestConversionRate: 75,
      requestsByStatus: {
        pending: 1,
        accepted: 1,
        rejected: 1
      }
    });
    expect(forbidden.status).toBe(403);
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({
      publishedOffers: 1,
      totalViews: 4,
      totalFavorites: 1,
      totalRequests: 3,
      averageConversionRate: 75
    });
  });
});
