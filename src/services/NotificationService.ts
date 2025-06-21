export interface NotificationPayload {
  type: 'signal' | 'trade' | 'alert';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface EmailConfig {
  enabled: boolean;
  address: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  headers?: { [key: string]: string };
}

export class NotificationService {
  private emailConfig: EmailConfig;
  private telegramConfig: TelegramConfig;
  private webhookConfig: WebhookConfig;

  constructor(
    emailConfig: EmailConfig,
    telegramConfig: TelegramConfig,
    webhookConfig: WebhookConfig
  ) {
    this.emailConfig = emailConfig;
    this.telegramConfig = telegramConfig;
    this.webhookConfig = webhookConfig;
  }

  /**
   * Send notification through all enabled channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.emailConfig.enabled) {
      console.warn('Email notifications are not supported in browser environment. Please use a backend service for email functionality.');
    }

    if (this.telegramConfig.enabled) {
      promises.push(this.sendTelegram(payload));
    }

    if (this.webhookConfig.enabled) {
      promises.push(this.sendWebhook(payload));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegram(payload: NotificationPayload): Promise<void> {
    if (!this.telegramConfig.botToken || !this.telegramConfig.chatId) {
      throw new Error('Telegram not configured');
    }

    const message = this.formatTelegramMessage(payload);
    const url = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.telegramConfig.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    if (!this.webhookConfig.url) {
      throw new Error('Webhook not configured');
    }

    try {
      const response = await fetch(this.webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.webhookConfig.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      console.log('Webhook notification sent successfully');
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(payload: NotificationPayload): string {
    const priorityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🔴',
    };

    const typeEmoji = {
      signal: '📊',
      trade: '💰',
      alert: '⚠️',
    };

    let message = `${priorityEmoji[payload.priority]} ${typeEmoji[payload.type]} *${payload.title}*\n\n`;
    message += `${payload.message}\n\n`;
    
    if (payload.data) {
      message += `📋 *Details:*\n`;
      Object.entries(payload.data).forEach(([key, value]) => {
        message += `• ${key}: \`${value}\`\n`;
      });
      message += '\n';
    }
    
    message += `🕐 ${new Date(payload.timestamp).toLocaleString()}`;

    return message;
  }

  /**
   * Test notification delivery
   */
  async testNotification(type: 'email' | 'telegram' | 'webhook'): Promise<boolean> {
    const testPayload: NotificationPayload = {
      type: 'alert',
      title: 'Test Notification',
      message: 'This is a test notification to verify your configuration.',
      priority: 'medium',
      timestamp: Date.now(),
    };

    try {
      switch (type) {
        case 'email':
          console.warn('Email notifications are not supported in browser environment. Please use a backend service for email functionality.');
          return false;
        case 'telegram':
          await this.sendTelegram(testPayload);
          break;
        case 'webhook':
          await this.sendWebhook(testPayload);
          break;
      }
      return true;
    } catch (error) {
      console.error(`Test ${type} notification failed:`, error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(
    emailConfig?: Partial<EmailConfig>,
    telegramConfig?: Partial<TelegramConfig>,
    webhookConfig?: Partial<WebhookConfig>
  ): void {
    if (emailConfig) {
      this.emailConfig = { ...this.emailConfig, ...emailConfig };
    }
    
    if (telegramConfig) {
      this.telegramConfig = { ...this.telegramConfig, ...telegramConfig };
    }
    
    if (webhookConfig) {
      this.webhookConfig = { ...this.webhookConfig, ...webhookConfig };
    }
  }
}