import Stripe from 'stripe';
import { Plugin, PluginPurchase } from '../models/PluginModel';
import { User } from '../models/UserModel';

/**
 * Service for handling Stripe payments and subscriptions
 */
export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private apiKey: string;
  
  // In-memory storage for purchases (would be a database in production)
  private purchases: Map<string, PluginPurchase> = new Map();
  
  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    });
  }
  
  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(user: User): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.fullName || user.username,
        metadata: {
          userId: user.id
        }
      });
      
      return customer.id;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }
  
  /**
   * Create a payment intent for a one-time purchase
   */
  async createPaymentIntent(
    plugin: Plugin, 
    user: User, 
    customerIdOrPaymentMethod?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        customerId = await this.createCustomer(user);
      }
      
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(plugin.price * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: customerIdOrPaymentMethod?.startsWith('pm_') ? customerIdOrPaymentMethod : undefined,
        metadata: {
          userId: user.id,
          pluginId: plugin.id,
          pluginName: plugin.name,
          pricingModel: plugin.pricingModel
        },
        description: `Purchase of ${plugin.name} v${plugin.version}`,
      });
      
      // Create purchase record
      const purchase: PluginPurchase = {
        id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pluginId: plugin.id,
        userId: user.id,
        transactionId: paymentIntent.id,
        amount: plugin.price,
        currency: 'USD',
        status: 'pending',
        purchaseDate: new Date(),
        stripeCustomerId: customerId,
        stripePaymentIntentId: paymentIntent.id
      };
      
      this.purchases.set(purchase.id, purchase);
      
      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Failed to create payment');
    }
  }
  
  /**
   * Create a subscription for a plugin
   */
  async createSubscription(
    plugin: Plugin, 
    user: User, 
    paymentMethodId: string
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    try {
      if (plugin.pricingModel !== 'subscription' || !plugin.subscriptionInterval) {
        throw new Error('Plugin is not a subscription product');
      }
      
      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        customerId = await this.createCustomer(user);
      }
      
      // Attach payment method to customer if provided
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
        
        // Set as default payment method
        await this.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }
      
      // Get or create price
      const priceId = await this.getOrCreatePrice(plugin);
      
      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id,
          pluginId: plugin.id,
          pluginName: plugin.name,
          pricingModel: plugin.pricingModel
        }
      });
      
      // Create purchase record
      const purchase: PluginPurchase = {
        id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pluginId: plugin.id,
        userId: user.id,
        transactionId: subscription.id,
        amount: plugin.price,
        currency: 'USD',
        status: 'pending',
        purchaseDate: new Date(),
        expiresAt: new Date(subscription.current_period_end * 1000),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId
      };
      
      this.purchases.set(purchase.id, purchase);
      
      // Get client secret for payment if available
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      const clientSecret = paymentIntent?.client_secret;
      
      return {
        subscriptionId: subscription.id,
        clientSecret
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }
  
  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
      
      // Update purchase record
      for (const purchase of this.purchases.values()) {
        if (purchase.stripeSubscriptionId === subscriptionId) {
          purchase.status = 'canceled';
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }
  
  /**
   * Process a webhook event from Stripe
   */
  async handleWebhookEvent(body: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Webhook error');
    }
  }
  
  /**
   * Get all purchases for a user
   */
  async getUserPurchases(userId: string): Promise<PluginPurchase[]> {
    return Array.from(this.purchases.values()).filter(p => p.userId === userId);
  }
  
  /**
   * Get all purchases for a plugin
   */
  async getPluginPurchases(pluginId: string): Promise<PluginPurchase[]> {
    return Array.from(this.purchases.values()).filter(p => p.pluginId === pluginId);
  }
  
  /**
   * Check if a user has purchased a plugin
   */
  async hasUserPurchasedPlugin(userId: string, pluginId: string): Promise<boolean> {
    const purchases = Array.from(this.purchases.values());
    
    return purchases.some(p => 
      p.userId === userId && 
      p.pluginId === pluginId && 
      (p.status === 'completed' || p.status === 'pending') &&
      (!p.expiresAt || p.expiresAt > new Date())
    );
  }
  
  /**
   * Get or create a Stripe price for a plugin
   */
  private async getOrCreatePrice(plugin: Plugin): Promise<string> {
    // In a real implementation, we would store price IDs in the database
    // For this example, we'll create a new price each time
    
    const interval = plugin.subscriptionInterval || 'month';
    
    const price = await this.stripe.prices.create({
      unit_amount: Math.round(plugin.price * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: interval as Stripe.PriceRecurringInterval,
      },
      product_data: {
        name: plugin.name,
        description: plugin.description,
        metadata: {
          pluginId: plugin.id,
          version: plugin.version
        }
      },
      metadata: {
        pluginId: plugin.id,
        version: plugin.version
      }
    });
    
    return price.id;
  }
  
  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const pluginId = paymentIntent.metadata?.pluginId;
    const userId = paymentIntent.metadata?.userId;
    
    if (!pluginId || !userId) {
      return;
    }
    
    // Update purchase status
    for (const purchase of this.purchases.values()) {
      if (purchase.stripePaymentIntentId === paymentIntent.id) {
        purchase.status = 'completed';
        break;
      }
    }
  }
  
  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const pluginId = paymentIntent.metadata?.pluginId;
    const userId = paymentIntent.metadata?.userId;
    
    if (!pluginId || !userId) {
      return;
    }
    
    // Update purchase status
    for (const purchase of this.purchases.values()) {
      if (purchase.stripePaymentIntentId === paymentIntent.id) {
        purchase.status = 'failed';
        break;
      }
    }
  }
  
  /**
   * Handle invoice paid event
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      return;
    }
    
    // Update purchase status
    for (const purchase of this.purchases.values()) {
      if (purchase.stripeSubscriptionId === subscriptionId) {
        purchase.status = 'completed';
        
        // Update expiration date
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        purchase.expiresAt = new Date(subscription.current_period_end * 1000);
        break;
      }
    }
  }
  
  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      return;
    }
    
    // Update purchase status
    for (const purchase of this.purchases.values()) {
      if (purchase.stripeSubscriptionId === subscriptionId) {
        purchase.status = 'failed';
        break;
      }
    }
  }
  
  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const pluginId = subscription.metadata?.pluginId;
    const userId = subscription.metadata?.userId;
    
    if (!pluginId || !userId) {
      return;
    }
    
    // This is handled by createSubscription method
  }
  
  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const pluginId = subscription.metadata?.pluginId;
    const userId = subscription.metadata?.userId;
    
    if (!pluginId || !userId) {
      return;
    }
    
    // Update purchase record
    for (const purchase of this.purchases.values()) {
      if (purchase.stripeSubscriptionId === subscription.id) {
        purchase.expiresAt = new Date(subscription.current_period_end * 1000);
        
        if (subscription.status === 'active') {
          purchase.status = 'completed';
        } else if (subscription.status === 'past_due') {
          purchase.status = 'pending';
        } else if (subscription.status === 'canceled') {
          purchase.status = 'canceled';
        }
        
        break;
      }
    }
  }
  
  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const pluginId = subscription.metadata?.pluginId;
    const userId = subscription.metadata?.userId;
    
    if (!pluginId || !userId) {
      return;
    }
    
    // Update purchase record
    for (const purchase of this.purchases.values()) {
      if (purchase.stripeSubscriptionId === subscription.id) {
        purchase.status = 'canceled';
        break;
      }
    }
  }
}