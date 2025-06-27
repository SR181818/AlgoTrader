import { User } from './UserModel';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorId: string;
  category: PluginCategory;
  tags: string[];
  price: number; // 0 for free plugins
  pricingModel: 'free' | 'one-time' | 'subscription';
  subscriptionInterval?: 'month' | 'year';
  downloadCount: number;
  rating: number;
  ratingCount: number;
  status: PluginStatus;
  isVerified: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastDownloadedAt?: Date;
  repositoryUrl?: string;
  homepageUrl?: string;
  supportUrl?: string;
  licenseType: string;
  dependencies: string[];
  compatibleVersions: string[];
  minAppVersion: string;
  maxAppVersion?: string;
  thumbnailUrl?: string;
  screenshotUrls: string[];
  readmeContent?: string;
  changelogContent?: string;
}

export type PluginCategory = 
  | 'indicator' 
  | 'strategy' 
  | 'risk-management' 
  | 'data-source' 
  | 'visualization' 
  | 'utility' 
  | 'ml-model'
  | 'integration';

export type PluginStatus = 
  | 'draft' 
  | 'pending-review' 
  | 'approved' 
  | 'rejected' 
  | 'published' 
  | 'deprecated' 
  | 'suspended';

export interface PluginVersion {
  id: string;
  pluginId: string;
  version: string;
  description: string;
  downloadUrl: string;
  fileSize: number;
  sha256Hash: string;
  createdAt: Date;
  publishedAt?: Date;
  isLatest: boolean;
  minAppVersion: string;
  maxAppVersion?: string;
  changelogContent?: string;
  dependencies: string[];
}

export interface PluginRating {
  id: string;
  pluginId: string;
  userId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginPurchase {
  id: string;
  pluginId: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchaseDate: Date;
  expiresAt?: Date; // For subscriptions
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  stripePriceId?: string;
}

export interface PluginInstallation {
  id: string;
  pluginId: string;
  userId: string;
  versionId: string;
  installedAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  settings?: Record<string, any>;
}

// Schema definitions for database
export const SCHEMA_DEFINITIONS = {
  plugins: `
    CREATE TABLE IF NOT EXISTS plugins (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      version VARCHAR(20) NOT NULL,
      author VARCHAR(100) NOT NULL,
      author_id VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      tags TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      pricing_model VARCHAR(20) NOT NULL DEFAULT 'free',
      subscription_interval VARCHAR(10),
      download_count INTEGER NOT NULL DEFAULT 0,
      rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      published_at TIMESTAMP,
      last_downloaded_at TIMESTAMP,
      repository_url TEXT,
      homepage_url TEXT,
      support_url TEXT,
      license_type VARCHAR(50) NOT NULL DEFAULT 'MIT',
      dependencies TEXT NOT NULL DEFAULT '[]',
      compatible_versions TEXT NOT NULL DEFAULT '[]',
      min_app_version VARCHAR(20) NOT NULL,
      max_app_version VARCHAR(20),
      thumbnail_url TEXT,
      screenshot_urls TEXT NOT NULL DEFAULT '[]',
      readme_content TEXT,
      changelog_content TEXT
    );
  `,
  
  plugin_versions: `
    CREATE TABLE IF NOT EXISTS plugin_versions (
      id VARCHAR(50) PRIMARY KEY,
      plugin_id VARCHAR(50) NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      version VARCHAR(20) NOT NULL,
      description TEXT NOT NULL,
      download_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      published_at TIMESTAMP,
      is_latest BOOLEAN NOT NULL DEFAULT FALSE,
      min_app_version VARCHAR(20) NOT NULL,
      max_app_version VARCHAR(20),
      changelog_content TEXT,
      dependencies TEXT NOT NULL DEFAULT '[]',
      UNIQUE(plugin_id, version)
    );
  `,
  
  plugin_ratings: `
    CREATE TABLE IF NOT EXISTS plugin_ratings (
      id VARCHAR(50) PRIMARY KEY,
      plugin_id VARCHAR(50) NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      user_id VARCHAR(50) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(plugin_id, user_id)
    );
  `,
  
  plugin_purchases: `
    CREATE TABLE IF NOT EXISTS plugin_purchases (
      id VARCHAR(50) PRIMARY KEY,
      plugin_id VARCHAR(50) NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      user_id VARCHAR(50) NOT NULL,
      transaction_id VARCHAR(100) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      purchase_date TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP,
      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100),
      stripe_payment_intent_id VARCHAR(100),
      stripe_price_id VARCHAR(100)
    );
  `,
  
  plugin_installations: `
    CREATE TABLE IF NOT EXISTS plugin_installations (
      id VARCHAR(50) PRIMARY KEY,
      plugin_id VARCHAR(50) NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
      user_id VARCHAR(50) NOT NULL,
      version_id VARCHAR(50) NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
      installed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      settings JSONB
    );
  `
};