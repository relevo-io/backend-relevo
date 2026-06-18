import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import app from '../src/app.js';
import { TEST_OWNER, TEST_USER } from './setup.js';
import { OfertaModel } from '../src/models/ofertaModel.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';

describe('Monetization rules', () => {
  let ownerToken: string;
  let userToken: string;
  let ownerId: string;

  beforeEach(async () => {
    const ownerLogin = await request(app).post('/api/auth/login').send({
      email: TEST_OWNER.email,
      password: TEST_OWNER.password
    });
    ownerToken = ownerLogin.body.accessToken;

    const userLogin = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    userToken = userLogin.body.accessToken;

    const owner = await UsuarioModel.findOne({ email: TEST_OWNER.email });
    ownerId = String(owner!._id);
  });

  const purchaseCredit = async () =>
    request(app).post('/api/ofertas/publication-credit/purchase').set('Authorization', `Bearer ${ownerToken}`);

  const createOfferWithCredit = async (
    overrides?: Partial<{ region: string; sector: string; companyDescription: string }>
  ) => {
    await purchaseCredit();

    return request(app)
      .post('/api/ofertas')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        region: overrides?.region ?? 'Barcelona',
        sector: overrides?.sector ?? 'Technology',
        owner: ownerId,
        companyDescription: overrides?.companyDescription ?? 'Profitable software business'
      });
  };

  const createFavoriteCandidateOffer = async (index: number) =>
    OfertaModel.create({
      owner: new Types.ObjectId(ownerId),
      region: `Region ${index}`,
      sector: index === 4 ? 'Services' : 'Technology',
      employeeRange: index % 2 === 0 ? '11_25' : '26_50',
      revenueRange: index % 2 === 0 ? 'BETWEEN_100K_500K' : 'BETWEEN_500K_1M',
      creationYear: 2015 + index,
      companyDescription: `Offer ${index}`
    });

  it('should reject publishing when the owner has no credit', async () => {
    const response = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Madrid',
      sector: 'Retail',
      owner: ownerId,
      companyDescription: 'Established local business'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('MONETIZATION.PUBLISH_CREDIT_REQUIRED');
  });

  it('should grant exactly one publication credit per simulated payment and consume it on publish', async () => {
    const payment = await purchaseCredit();
    expect(payment.status).toBe(200);
    expect(payment.body.publicationCredits).toBe(1);

    const created = await request(app).post('/api/ofertas').set('Authorization', `Bearer ${ownerToken}`).send({
      region: 'Madrid',
      sector: 'Retail',
      owner: ownerId,
      companyDescription: 'Established local business'
    });

    expect(created.status).toBe(201);

    const owner = await UsuarioModel.findById(ownerId).lean();
    expect(owner?.publicationCredits).toBe(0);
  });

  it('should activate Pro for 30 days', async () => {
    const response = await request(app)
      .post('/api/usuarios/me/pro/activate')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.proActive).toBe(true);

    const expiresAt = new Date(response.body.proExpiresAt).getTime();
    const days = (expiresAt - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30.01);
  });

  it('should block the fourth favorite for a free user and remove the limit for Pro', async () => {
    const offers = await Promise.all([
      createFavoriteCandidateOffer(1),
      createFavoriteCandidateOffer(2),
      createFavoriteCandidateOffer(3),
      createFavoriteCandidateOffer(4)
    ]);

    for (const offer of offers.slice(0, 3)) {
      const response = await request(app)
        .post(`/api/ofertas/${offer._id}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(200);
    }

    const blocked = await request(app)
      .post(`/api/ofertas/${offers[3]._id}/favorite`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe('MONETIZATION.FAVORITES_LIMIT_REACHED');

    await request(app).post('/api/usuarios/me/pro/activate').set('Authorization', `Bearer ${userToken}`);

    const allowed = await request(app)
      .post(`/api/ofertas/${offers[3]._id}/favorite`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(allowed.status).toBe(200);
    expect(allowed.body.favoriteCount).toBe(1);
  });

  it('should block a second request within 7 days for a free user and remove the limit for Pro', async () => {
    const firstOffer = await createOfferWithCredit({
      region: 'Bilbao',
      sector: 'Services',
      companyDescription: 'Offer one'
    });
    const secondOffer = await createOfferWithCredit({
      region: 'Sevilla',
      sector: 'Retail',
      companyDescription: 'Offer two'
    });

    const requestBody = {
      message: 'Interested in learning more',
      bio: 'Experienced operator with acquisition focus',
      professionalBackground: '10 years leading SME operations and growth',
      preferredRegions: ['Barcelona'],
      availableCapital: 150000,
      financingNeeded: false,
      ndaAccepted: true
    };

    const firstResponse = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        opportunityId: firstOffer.body._id,
        ...requestBody
      });
    expect(firstResponse.status).toBe(201);

    const blocked = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        opportunityId: secondOffer.body._id,
        ...requestBody
      });
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe('MONETIZATION.REQUESTS_LIMIT_REACHED');

    await request(app).post('/api/usuarios/me/pro/activate').set('Authorization', `Bearer ${userToken}`);

    const thirdOffer = await createOfferWithCredit({
      region: 'Valencia',
      sector: 'Technology',
      companyDescription: 'Offer three'
    });

    const allowed = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        opportunityId: thirdOffer.body._id,
        ...requestBody
      });

    expect(allowed.status).toBe(201);
  });

  it('should apply advanced filters for Pro users', async () => {
    await OfertaModel.create([
      {
        owner: new Types.ObjectId(ownerId),
        region: 'Barcelona',
        sector: 'Technology',
        employeeRange: '11_25',
        revenueRange: 'BETWEEN_100K_500K',
        creationYear: 2018,
        companyDescription: 'Matching offer'
      },
      {
        owner: new Types.ObjectId(ownerId),
        region: 'Madrid',
        sector: 'Retail',
        employeeRange: '51_100',
        revenueRange: 'OVER_5M',
        creationYear: 2005,
        companyDescription: 'Non matching offer'
      }
    ]);

    await request(app).post('/api/usuarios/me/pro/activate').set('Authorization', `Bearer ${userToken}`);

    const filtered = await request(app)
      .get(
        '/api/ofertas?page=1&limit=12&sector=Technology&region=Barcelona&employeeRange=11_25&revenueRange=BETWEEN_100K_500K&creationYearFrom=2015&creationYearTo=2020'
      )
      .set('Authorization', `Bearer ${userToken}`);

    expect(filtered.status).toBe(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].companyDescription).toBe('Matching offer');
  });
});
