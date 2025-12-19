import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app, issueToken, verifyToken } from '../server.js';

describe('auth token helpers', () => {
  it('accepts a valid token and hydrates userToken', () => {
    const token = issueToken({ email: 'a@test.com', ts: 1 });
    const req: any = {
      get: () => `Bearer ${token}`
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userToken.email).toBe('a@test.com');
  });

  it('rejects a tampered token', () => {
    const token = issueToken({ email: 'a@test.com', ts: 1 }) + 'x';
    const req: any = { get: () => `Bearer ${token}` };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad signature' });
  });
});

describe('auth endpoints', () => {
  it('returns ok from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('issues a token on /api/login', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'login@test.com', name: 'Login User' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.token).toBeTruthy();
    expect(res.body.user.isAuthenticated).toBe(true);
  });

  it('fails login when email missing', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
  });
});
