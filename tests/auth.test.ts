import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

describe('Authentication & Authorization Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /api/auth/login - should fail with invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@university.edu',
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me - should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me - should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
