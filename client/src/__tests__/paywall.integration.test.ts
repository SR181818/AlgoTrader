import { AlgorandPaywall } from '../blockchain/AlgorandPaywall';

describe('Paywall Integration', () => {
  it('should handle wallet connection errors gracefully', async () => {
    const paywall = new AlgorandPaywall();
    await expect(paywall.connectWallet('invalid' as any)).rejects.toBeDefined();
  });
});
