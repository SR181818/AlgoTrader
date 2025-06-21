export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  stripeCustomerId?: string;
  subscriptionTier?: 'free' | 'basic' | 'pro' | 'enterprise';
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
  subscriptionExpiresAt?: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    inApp: boolean;
    pluginUpdates: boolean;
    marketplaceNews: boolean;
  };
  developerMode: boolean;
  experimentalFeatures: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account' | 'other';
  isDefault: boolean;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definitions for database
export const SCHEMA_DEFINITIONS = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(50) NOT NULL UNIQUE,
      full_name VARCHAR(100),
      avatar_url TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      is_developer BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMP,
      stripe_customer_id VARCHAR(100),
      subscription_tier VARCHAR(20),
      subscription_status VARCHAR(20),
      subscription_expires_at TIMESTAMP
    );
  `,
  
  user_settings: `
    CREATE TABLE IF NOT EXISTS user_settings (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme VARCHAR(20) NOT NULL DEFAULT 'dark',
      notifications JSONB NOT NULL DEFAULT '{"email": true, "inApp": true, "pluginUpdates": true, "marketplaceNews": true}',
      developer_mode BOOLEAN NOT NULL DEFAULT FALSE,
      experimental_features BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `,
  
  user_payment_methods: `
    CREATE TABLE IF NOT EXISTS user_payment_methods (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_payment_method_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      last4 VARCHAR(4) NOT NULL,
      expiry_month SMALLINT,
      expiry_year SMALLINT,
      brand VARCHAR(20),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  
  user_subscriptions: `
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tier VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP,
      renewal_date TIMESTAMP,
      stripe_subscription_id VARCHAR(100),
      stripe_price_id VARCHAR(100),
      auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `
};