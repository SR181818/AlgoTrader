import request from 'supertest';
import app from '../app'; // Adjust if your Express app is exported elsewhere

describe('API Integration: Portfolio Risk', () => {
  it('should reject risk limit update > 5%', async () => {
    const res = await request(app)
      .put('/api/portfolios/test-portfolio/risk')
      .send({ maxRiskPerTrade: 0.1 });
    expect(res.status).toBe(400);
  });

  it('should accept valid risk limit update', async () => {
    const res = await request(app)
      .put('/api/portfolios/test-portfolio/risk')
      .send({ maxRiskPerTrade: 0.03 });
    expect(res.status).toBe(200);
  });
});
