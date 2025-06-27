import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import { AlgodClient, Indexer } from 'algosdk';
import { AlgorandConfig, DEFAULT_ALGORAND_CONFIG, WalletProvider } from './AlgorandPaywall';

/**
 * User identity information
 */
export interface UserIdentity {
  address: string;
  publicKey: string;
  name?: string;
  email?: string;
  profileImage?: string;
  verified: boolean;
  createdAt: Date;
  lastLogin: Date;
}

/**
 * Verification status for identity claims
 */
export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

/**
 * Identity claim (attribute that can be verified)
 */
export interface IdentityClaim {
  type: 'email' | 'name' | 'age' | 'location' | 'custom';
  value: string;
  status: VerificationStatus;
  verificationTxId?: string;
  verifiedAt?: Date;
}

/**
 * Decentralized identity manager using Algorand
 */
export class AlgorandIdentity {
  private algodClient: AlgodClient;
  private indexerClient: Indexer;
  private peraWallet: PeraWalletConnect;
  private myAlgoWallet: MyAlgoConnect;
  public config: AlgorandConfig;
  private connectedAccounts: string[] = [];
  private currentIdentity: UserIdentity | null = null;
  private identityClaims: Map<string, IdentityClaim[]> = new Map();
  private onConnectCallback: ((accounts: string[]) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onIdentityChangeCallback: ((identity: UserIdentity | null) => void) | null = null;

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
        this.loadIdentity(accounts[0]);
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
        await this.loadIdentity(accounts[0]);
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
      this.currentIdentity = null;
      this.onDisconnectCallback?.();
      this.onIdentityChangeCallback?.(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  /**
   * Load user identity from blockchain
   */
  async loadIdentity(address: string): Promise<UserIdentity | null> {
    try {
      // Check if the address has any transactions
      const accountInfo = await this.algodClient.accountInformation(address).do();
      
      // Create basic identity from account info
      const identity: UserIdentity = {
        address,
        publicKey: accountInfo.participation.vote_pk || '',
        verified: false,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      // Load identity claims from note field in transactions
      await this.loadIdentityClaims(address);
      
      // Update identity with claims
      const claims = this.identityClaims.get(address) || [];
      claims.forEach(claim => {
        if (claim.status === VerificationStatus.VERIFIED) {
          if (claim.type === 'name') identity.name = claim.value;
          if (claim.type === 'email') identity.email = claim.value;
        }
      });
      
      // Check if identity is verified
      identity.verified = claims.some(claim => 
        claim.status === VerificationStatus.VERIFIED && 
        (claim.type === 'email' || claim.type === 'name')
      );
      
      this.currentIdentity = identity;
      this.onIdentityChangeCallback?.(identity);
      
      return identity;
    } catch (error) {
      console.error('Error loading identity:', error);
      return null;
    }
  }

  /**
   * Add identity claim
   */
  async addIdentityClaim(claim: Omit<IdentityClaim, 'status' | 'verificationTxId' | 'verifiedAt'>): Promise<IdentityClaim> {
    if (this.connectedAccounts.length === 0) {
      throw new Error('No wallet connected');
    }
    
    try {
      const address = this.connectedAccounts[0];
      
      // Create claim object
      const newClaim: IdentityClaim = {
        ...claim,
        status: VerificationStatus.UNVERIFIED
      };
      
      // Store claim on-chain by sending a transaction with the claim in the note field
      const params = await this.algodClient.getTransactionParams().do();
      
      const note = new Uint8Array(Buffer.from(JSON.stringify({
        type: 'identity_claim',
        claim: newClaim
      })));
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: address,
        to: address, // Self-transaction
        amount: 0,
        note,
        suggestedParams: params
      });
      
      // Sign transaction
      let signedTxn;
      
      if (this.peraWallet.isConnected) {
        const txnsToSign = [{ txn, signers: [address] }];
        const signedTxns = await this.peraWallet.signTransaction([txnsToSign]);
        signedTxn = signedTxns[0];
      } else {
        const signedTxns = await this.myAlgoWallet.signTransaction(txn.toByte());
        signedTxn = signedTxns.blob;
      }
      
      // Submit transaction
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      await this.waitForConfirmation(txId);
      
      // Update claim with transaction ID
      newClaim.verificationTxId = txId;
      
      // Update local claims
      const claims = this.identityClaims.get(address) || [];
      claims.push(newClaim);
      this.identityClaims.set(address, claims);
      
      return newClaim;
    } catch (error) {
      console.error('Error adding identity claim:', error);
      throw error;
    }
  }

  /**
   * Verify identity claim (would be called by a verification authority)
   */
  async verifyIdentityClaim(address: string, claimType: string, claimValue: string): Promise<boolean> {
    try {
      // In a real implementation, this would involve a verification authority
      // signing a transaction to verify the claim
      
      // For demo purposes, we'll simulate verification
      const claims = this.identityClaims.get(address) || [];
      const claimIndex = claims.findIndex(c => c.type === claimType && c.value === claimValue);
      
      if (claimIndex === -1) {
        return false;
      }
      
      // Update claim status
      claims[claimIndex].status = VerificationStatus.VERIFIED;
      claims[claimIndex].verifiedAt = new Date();
      
      // Update identity if this is the current user
      if (this.currentIdentity && this.currentIdentity.address === address) {
        if (claimType === 'name') this.currentIdentity.name = claimValue;
        if (claimType === 'email') this.currentIdentity.email = claimValue;
        
        this.currentIdentity.verified = true;
        this.onIdentityChangeCallback?.(this.currentIdentity);
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying identity claim:', error);
      return false;
    }
  }

  /**
   * Get current identity
   */
  getCurrentIdentity(): UserIdentity | null {
    return this.currentIdentity;
  }

  /**
   * Get identity claims for an address
   */
  getIdentityClaims(address: string): IdentityClaim[] {
    return this.identityClaims.get(address) || [];
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
   * Set callback for identity changes
   */
  onIdentityChange(callback: (identity: UserIdentity | null) => void): void {
    this.onIdentityChangeCallback = callback;
  }

  /**
   * Load identity claims from blockchain
   */
  private async loadIdentityClaims(address: string): Promise<void> {
    try {
      // Query the indexer for transactions from this address
      const transactions = await this.indexerClient.lookupAccountTransactions(address).do();
      
      if (!transactions.transactions || transactions.transactions.length === 0) {
        return;
      }
      
      const claims: IdentityClaim[] = [];
      
      // Look for transactions with identity claims in the note field
      for (const tx of transactions.transactions) {
        if (!tx.note) continue;
        
        try {
          const noteString = Buffer.from(tx.note, 'base64').toString();
          const noteData = JSON.parse(noteString);
          
          if (noteData.type === 'identity_claim' && noteData.claim) {
            const claim: IdentityClaim = {
              ...noteData.claim,
              verificationTxId: tx.id,
              // In a real implementation, we would check for verification transactions
              status: VerificationStatus.UNVERIFIED
            };
            
            claims.push(claim);
          }
        } catch (e) {
          // Not a valid JSON note, skip
          continue;
        }
      }
      
      // Store claims
      this.identityClaims.set(address, claims);
    } catch (error) {
      console.error('Error loading identity claims:', error);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(txId: string): Promise<any> {
    const status = await this.algodClient.status().do();
    let lastRound = status['last-round'];
    
    while (true) {
      const pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        return pendingInfo;
      }
      
      lastRound++;
      await this.algodClient.statusAfterBlock(lastRound).do();
    }
  }
}