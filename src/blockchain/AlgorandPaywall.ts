import { PeraWalletConnect } from '@perawallet/connect';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import { AlgodClient, Indexer } from 'algosdk';

/**
 * Subscription tiers for the trading dashboard
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

/**
 * Subscription details
 */
export interface Subscription {
  tier: SubscriptionTier;
  startDate: Date;
  endDate: Date;
  transactionId: string;
  walletAddress: string;
  active: boolean;
}

/**
 * Subscription pricing in microAlgos
 */
export const SUBSCRIPTION_PRICES = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.BASIC]: 5_000_000, // 5 Algos
  [SubscriptionTier.PRO]: 20_000_000,  // 20 Algos
  [SubscriptionTier.ENTERPRISE]: 100_000_000 // 100 Algos
};

/**
 * Subscription durations in days
 */
export const SUBSCRIPTION_DURATIONS = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.BASIC]: 30,
  [SubscriptionTier.PRO]: 30,
  [SubscriptionTier.ENTERPRISE]: 30
};

/**
 * Features available for each subscription tier
 */
export const SUBSCRIPTION_FEATURES = {
  [SubscriptionTier.FREE]: [
    'Basic market data',
    'Limited technical indicators',
    'Single timeframe analysis',
    'Paper trading'
  ],
  [SubscriptionTier.BASIC]: [
    'All FREE features',
    'Real-time market data',
    'Full technical indicator library',
    'Multi-timeframe analysis',
    'Basic backtesting'
  ],
  [SubscriptionTier.PRO]: [
    'All BASIC features',
    'Advanced backtesting',
    'Custom strategy builder',
    'ML model integration',
    'Portfolio management',
    'Risk management tools'
  ],
  [SubscriptionTier.ENTERPRISE]: [
    'All PRO features',
    'API access',
    'Custom indicators',
    'Priority support',
    'Multiple portfolios',
    'Team collaboration'
  ]
};

/**
 * Algorand network configuration
 */
export interface AlgorandConfig {
  network: 'mainnet' | 'testnet' | 'betanet';
  algodToken: string;
  algodServer: string;
  algodPort: string;
  indexerToken: string;
  indexerServer: string;
  indexerPort: string;
  appId: number; // Smart contract application ID
}

/**
 * Default Algorand configuration for testnet
 */
export const DEFAULT_ALGORAND_CONFIG: AlgorandConfig = {
  network: 'testnet',
  algodToken: '',
  algodServer: 'https://testnet-api.algonode.cloud',
  algodPort: '',
  indexerToken: '',
  indexerServer: 'https://testnet-idx.algonode.cloud',
  indexerPort: '',
  appId: 12345 // Replace with actual app ID after deployment
};

/**
 * Wallet provider options
 */
export enum WalletProvider {
  PERA = 'pera',
  MYALGO = 'myalgo'
}

/**
 * Blockchain Paywall class for handling Algorand payments and subscriptions
 */
export class AlgorandPaywall {
  private algodClient: AlgodClient;
  private indexerClient: Indexer;
  private peraWallet: PeraWalletConnect;
  private myAlgoWallet: MyAlgoConnect;
  private config: AlgorandConfig;
  private connectedAccounts: string[] = [];
  private currentSubscription: Subscription | null = null;
  private onConnectCallback: ((accounts: string[]) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onSubscriptionChangeCallback: ((subscription: Subscription | null) => void) | null = null;

  constructor(config: AlgorandConfig = DEFAULT_ALGORAND_CONFIG) {
    this.config = config;
    
    // Initialize Algorand clients
    this.algodClient = new algosdk.Algodv2(
      config.algodToken, 
      config.algodServer, 
      config.algodPort
    );
    
    this.indexerClient = new algosdk.Indexer(
      config.indexerToken,
      config.indexerServer,
      config.indexerPort
    );
    
    // Initialize wallets
    this.peraWallet = new PeraWalletConnect({
      network: config.network
    });
    
    this.myAlgoWallet = new MyAlgoConnect({
      disableLedgerNano: false
    });
    
    // Setup reconnection for Pera wallet
    this.peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length > 0) {
        this.connectedAccounts = accounts;
        this.onConnectCallback?.(accounts);
        this.checkSubscription(accounts[0]);
      }
    });
  }

  /**
   * Connect to wallet
   */
  async connectWallet(provider: WalletProvider = WalletProvider.PERA): Promise<string[]> {
    try {
      let accounts: string[] = [];
      
      if (provider === WalletProvider.PERA) {
        accounts = await this.peraWallet.connect();
      } else {
        accounts = await this.myAlgoWallet.connect();
      }
      
      this.connectedAccounts = accounts;
      this.onConnectCallback?.(accounts);
      
      if (accounts.length > 0) {
        await this.checkSubscription(accounts[0]);
      }
      
      return accounts;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      await this.peraWallet.disconnect();
      this.connectedAccounts = [];
      this.currentSubscription = null;
      this.onDisconnectCallback?.();
      this.onSubscriptionChangeCallback?.(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  /**
   * Check if user has an active subscription
   */
  async checkSubscription(address: string): Promise<Subscription | null> {
    try {
      // Query the indexer for transactions to our application with retry/backoff
      const transactions = await withExponentialBackoff(() => this.indexerClient.lookupAccountTransactions(address).do());
      // Validate response schema
      if (!transactions || !Array.isArray(transactions.transactions)) throw new Error('Invalid indexer response');
      
      // Find the most recent subscription payment
      const subscriptionTx = this.findSubscriptionTransaction(transactions);
      
      if (subscriptionTx) {
        const tier = this.getTierFromAmount(subscriptionTx.amount);
        const startDate = new Date(subscriptionTx.timestamp * 1000);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + SUBSCRIPTION_DURATIONS[tier]);
        
        const subscription: Subscription = {
          tier,
          startDate,
          endDate,
          transactionId: subscriptionTx.id,
          walletAddress: address,
          active: endDate > new Date()
        };
        
        this.currentSubscription = subscription;
        this.onSubscriptionChangeCallback?.(subscription);
        return subscription;
      }
      
      // No subscription found
      this.currentSubscription = null;
      this.onSubscriptionChangeCallback?.(null);
      return null;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return null;
    }
  }

  /**
   * Subscribe to a tier
   */
  async subscribe(tier: SubscriptionTier): Promise<Subscription | null> {
    if (tier === SubscriptionTier.FREE) {
      // Free tier doesn't require payment
      const subscription: Subscription = {
        tier: SubscriptionTier.FREE,
        startDate: new Date(),
        endDate: new Date(9999, 11, 31), // Far future date
        transactionId: '',
        walletAddress: this.connectedAccounts[0] || '',
        active: true
      };
      
      this.currentSubscription = subscription;
      this.onSubscriptionChangeCallback?.(subscription);
      return subscription;
    }
    
    if (this.connectedAccounts.length === 0) {
      throw new Error('No wallet connected');
    }
    
    try {
      const amount = SUBSCRIPTION_PRICES[tier];
      const sender = this.connectedAccounts[0];
      // Get suggested transaction parameters with retry/backoff
      const params = await withExponentialBackoff(() => this.algodClient.getTransactionParams().do());
      
      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: this.getReceiverAddress(), // Application owner address
        amount,
        note: new Uint8Array(Buffer.from(`Subscription:${tier}`)),
        suggestedParams: params
      });
      
      // Sign transaction
      let signedTxn;
      
      if (this.peraWallet.isConnected) {
        const txnsToSign = [{ txn, signers: [sender] }];
        const signedTxns = await this.peraWallet.signTransaction([txnsToSign]);
        signedTxn = signedTxns[0];
      } else {
        const signedTxns = await this.myAlgoWallet.signTransaction(txn.toByte());
        signedTxn = signedTxns.blob;
      }
      
      // Submit transaction with retry/backoff
      const { txId } = await withExponentialBackoff(() => this.algodClient.sendRawTransaction(signedTxn).do());
      // Wait for confirmation with retry/backoff
      await withExponentialBackoff(() => this.waitForConfirmation(txId));
      
      // Create subscription object
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + SUBSCRIPTION_DURATIONS[tier]);
      
      const subscription: Subscription = {
        tier,
        startDate,
        endDate,
        transactionId: txId,
        walletAddress: sender,
        active: true
      };
      
      this.currentSubscription = subscription;
      this.onSubscriptionChangeCallback?.(subscription);
      return subscription;
    } catch (error) {
      // Surface error to dashboard via callback if available
      this.onSubscriptionChangeCallback?.(null);
      throw error;
    }
  }

  /**
   * Check if a feature is available for the current subscription
   */
  isFeatureAvailable(featureName: string): boolean {
    if (!this.currentSubscription || !this.currentSubscription.active) {
      // Only free features are available
      return SUBSCRIPTION_FEATURES[SubscriptionTier.FREE].includes(featureName);
    }
    
    const tier = this.currentSubscription.tier;
    
    // Check if feature is available in the current tier
    switch (tier) {
      case SubscriptionTier.ENTERPRISE:
        return true; // All features available
      case SubscriptionTier.PRO:
        return SUBSCRIPTION_FEATURES[SubscriptionTier.PRO].includes(featureName) ||
               SUBSCRIPTION_FEATURES[SubscriptionTier.BASIC].includes(featureName) ||
               SUBSCRIPTION_FEATURES[SubscriptionTier.FREE].includes(featureName);
      case SubscriptionTier.BASIC:
        return SUBSCRIPTION_FEATURES[SubscriptionTier.BASIC].includes(featureName) ||
               SUBSCRIPTION_FEATURES[SubscriptionTier.FREE].includes(featureName);
      case SubscriptionTier.FREE:
      default:
        return SUBSCRIPTION_FEATURES[SubscriptionTier.FREE].includes(featureName);
    }
  }

  /**
   * Get current subscription
   */
  getCurrentSubscription(): Subscription | null {
    return this.currentSubscription;
  }

  /**
   * Get connected accounts
   */
  getConnectedAccounts(): string[] {
    return this.connectedAccounts;
  }

  /**
   * Set callback for wallet connection
   */
  onConnect(callback: (accounts: string[]) => void): void {
    this.onConnectCallback = callback;
  }

  /**
   * Set callback for wallet disconnection
   */
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Set callback for subscription changes
   */
  onSubscriptionChange(callback: (subscription: Subscription | null) => void): void {
    this.onSubscriptionChangeCallback = callback;
  }

  /**
   * Get receiver address for payments
   */
  private getReceiverAddress(): string {
    // In a real implementation, this would be the application owner's address
    return 'ZZAF5ARA4MEC5PVDOP64JM5O5MQST63Q2KOY2FLYFLXXD3PFSNJJBYAFZM';
  }

  /**
   * Find subscription transaction from indexer results
   */
  private findSubscriptionTransaction(transactions: any): any {
    if (!transactions.transactions || transactions.transactions.length === 0) {
      return null;
    }
    
    // Look for payment transactions to our receiver address with the subscription note
    const subscriptionTxs = transactions.transactions.filter((tx: any) => {
      if (tx['tx-type'] !== 'pay') return false;
      if (tx['payment-transaction'].receiver !== this.getReceiverAddress()) return false;
      
      // Check if note contains subscription info
      if (tx.note) {
        const noteString = Buffer.from(tx.note, 'base64').toString();
        return noteString.startsWith('Subscription:');
      }
      
      return false;
    });
    
    // Sort by timestamp (descending) to get the most recent
    subscriptionTxs.sort((a: any, b: any) => b['round-time'] - a['round-time']);
    
    return subscriptionTxs.length > 0 ? {
      id: subscriptionTxs[0].id,
      amount: subscriptionTxs[0]['payment-transaction'].amount,
      timestamp: subscriptionTxs[0]['round-time']
    } : null;
  }

  /**
   * Get subscription tier from payment amount
   */
  private getTierFromAmount(amount: number): SubscriptionTier {
    if (amount >= SUBSCRIPTION_PRICES[SubscriptionTier.ENTERPRISE]) {
      return SubscriptionTier.ENTERPRISE;
    } else if (amount >= SUBSCRIPTION_PRICES[SubscriptionTier.PRO]) {
      return SubscriptionTier.PRO;
    } else if (amount >= SUBSCRIPTION_PRICES[SubscriptionTier.BASIC]) {
      return SubscriptionTier.BASIC;
    } else {
      return SubscriptionTier.FREE;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(txId: string): Promise<any> {
    // Add exponential backoff to each algod call
    const status = await withExponentialBackoff(() => this.algodClient.status().do());
    let lastRound = status['last-round'];
    while (true) {
      const pendingInfo = await withExponentialBackoff(() => this.algodClient.pendingTransactionInformation(txId).do());
      // Validate response schema
      if (!pendingInfo || typeof pendingInfo !== 'object') throw new Error('Invalid pending transaction response');
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        return pendingInfo;
      }
      lastRound++;
      await withExponentialBackoff(() => this.algodClient.statusAfterBlock(lastRound).do());
    }
  }
}

/**
 * Exponential backoff utility for Algorand API calls
 */
async function withExponentialBackoff<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise(res => setTimeout(res, delay));
      attempt++;
    }
  }
}