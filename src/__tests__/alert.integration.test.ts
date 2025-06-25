import { NotificationService } from '../services/NotificationService';

describe('Alert Integration', () => {
  it('should not throw if Telegram config is missing', async () => {
    await expect(NotificationService.sendTelegramAlert('test')).resolves.toBeUndefined();
  });
});
