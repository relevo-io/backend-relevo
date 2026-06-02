import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_ADMIN, TEST_USER } from './setup.js';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

describe('Assistant API', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);

        if (url.includes('/v1/schema/RelevoAssistantDocument')) {
          return jsonResponse({ class: 'RelevoAssistantDocument' });
        }

        if (url.includes('/v1/schema')) {
          return jsonResponse({});
        }

        if (url.includes('/v1/objects')) {
          return jsonResponse({});
        }

        if (url.includes('/v1/graphql')) {
          return jsonResponse({
            data: {
              Get: {
                RelevoAssistantDocument: [
                  {
                    kind: 'PLATFORM_INFO',
                    sourceId: 'platform-overview',
                    title: 'Que es Relevo',
                    content: 'Relevo conecta owners e interested.',
                    visibility: 'PUBLIC',
                    updatedAt: new Date().toISOString()
                  }
                ]
              }
            }
          });
        }

        if (url.includes('/api/generate')) {
          return jsonResponse({ response: 'Relevo conecta propietarios de pymes con compradores interesados.' });
        }

        return jsonResponse({ ok: true });
      }) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should answer public assistant questions without token', async () => {
    const response = await request(app).post('/api/assistant/chat').send({ message: 'Que es Relevo?' });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('PUBLIC');
    expect(response.body.answer).toContain('Relevo');
    expect(response.body.sources).toHaveLength(1);
  });

  it('should send simple greetings to the LLM without retrieved offer context', async () => {
    const response = await request(app).post('/api/assistant/chat').send({ message: 'buenas' });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('PUBLIC');
    expect(response.body.sources).toHaveLength(0);

    const fetchCalls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
    expect(fetchCalls.some((url) => url.includes('/api/generate'))).toBe(true);
    expect(fetchCalls.some((url) => url.includes('/v1/graphql'))).toBe(false);
  });

  it('should answer authenticated assistant questions with token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    const response = await request(app)
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ message: 'Que empresas me recomiendas?' });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('AUTHENTICATED');
  });

  it('should validate empty messages', async () => {
    const response = await request(app).post('/api/assistant/chat').send({ message: '' });

    expect(response.status).toBe(400);
  });

  it('should deny reindex to non admin users', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    const response = await request(app)
      .post('/api/assistant/reindex')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('should allow admin users to reindex assistant documents', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password
    });

    const response = await request(app)
      .post('/api/assistant/reindex')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.indexed).toBeGreaterThanOrEqual(5);
  });
});
