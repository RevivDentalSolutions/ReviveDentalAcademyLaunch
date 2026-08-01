/**
 * Stripe API Server
 *
 * A minimal Express server to handle Stripe Checkout Session creation
 * and webhook events. Run with: node server/stripe-server.js
 *
 * In production, replace this with Supabase Edge Functions or your backend.
 */
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.STRIPE_API_PORT || 3001;

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31',
});

// Required for verified webhook writes:
// SUPABASE_URL or VITE_SUPABASE_URL: your Supabase project URL.
// SUPABASE_SERVICE_ROLE_KEY: server-only service role key. Never expose it to the browser.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function requireSupabaseConfig() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase webhook env vars: SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

function getRequiredMetadata(session) {
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const productId = metadata.product_id;
  const productType = metadata.product_type;

  if (!userId || !productType) {
    throw new Error(`Checkout session ${session.id} is missing required metadata: user_id and product_type`);
  }

  if (productType === 'course' && !productId) {
    throw new Error(`Checkout session ${session.id} is missing required metadata: product_id`);
  }

  return { userId, productId, productType };
}

function unixToIso(timestamp) {
  return typeof timestamp === 'number'
    ? new Date(timestamp * 1000).toISOString()
    : null;
}

function getCustomerId(subscription) {
  return typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id || null;
}

function normalizeSubscriptionStatus(status) {
  const allowedStatuses = new Set(['incomplete', 'active', 'past_due', 'canceled', 'unpaid', 'trialing']);
  if (allowedStatuses.has(status)) return status;

  // The current Supabase schema only allows the statuses above. Any newer or
  // terminal Stripe status should not preserve Office Pro access.
  console.warn(`[Stripe] Mapping unsupported subscription status "${status}" to "canceled"`);
  return 'canceled';
}

async function syncSubscription(subscription) {
  requireSupabaseConfig();

  const { data: existing, error: lookupError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up subscription ${subscription.id}: ${lookupError.message}`);
  }

  if (!existing?.user_id) {
    console.warn(`[Stripe] No local subscription row found for ${subscription.id}; ignoring lifecycle event`);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: getCustomerId(subscription),
      status: normalizeSubscriptionStatus(subscription.status),
      current_period_start: unixToIso(subscription.current_period_start),
      current_period_end: unixToIso(subscription.current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) throw new Error(`Failed to sync subscription ${subscription.id}: ${error.message}`);
  console.log(`[Stripe] Synced subscription ${subscription.id} with status ${subscription.status}`);
}

async function syncSubscriptionById(subscriptionId) {
  if (!subscriptionId) {
    console.warn('[Stripe] Invoice event had no subscription ID; skipping subscription sync');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

async function grantMembershipAccess(session) {
  const { userId } = getRequiredMetadata(session);
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error(`Checkout session ${session.id} has no Stripe subscription ID`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: getCustomerId(subscription),
      plan_type: 'monthly',
      status: normalizeSubscriptionStatus(subscription.status),
      current_period_start: unixToIso(subscription.current_period_start),
      current_period_end: unixToIso(subscription.current_period_end),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
  console.log(`[Stripe] Granted membership access for user ${userId} via subscription ${subscription.id}`);
}

async function grantCourseAccess(session) {
  const { userId, productId } = getRequiredMetadata(session);
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new Error(`Checkout session ${session.id} has no Stripe payment intent ID`);
  }

  const amount = (session.amount_total || 0) / 100;
  const { error } = await supabase
    .from('purchases')
    .upsert({
      user_id: userId,
      course_id: productId,
      stripe_payment_intent_id: paymentIntentId,
      amount,
      status: 'completed',
    }, {
      onConflict: 'user_id, course_id',
    });

  if (error) throw new Error(`Failed to upsert purchase: ${error.message}`);
  console.log(`[Stripe] Granted course access for user ${userId}, course ${productId}`);
}

async function handleCheckoutCompleted(session) {
  requireSupabaseConfig();
  const { productType } = getRequiredMetadata(session);

  if (productType === 'membership') {
    await grantMembershipAccess(session);
    return;
  }

  if (productType === 'course') {
    await grantCourseAccess(session);
    return;
  }

  throw new Error(`Unsupported product_type metadata value: ${productType}`);
}

// Webhook endpoint needs raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    // Verified Stripe events are the only place this server grants access.
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object);
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;
        await syncSubscriptionById(subscriptionId);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handling error:', err);
    return res.status(500).json({ error: err.message || 'Webhook handling failed' });
  }

  res.json({ received: true });
});

// API routes need JSON body parsing
app.use('/api', express.json());

// Health check
app.get('/api/stripe/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.STRIPE_SECRET_KEY ? 'live' : 'demo' });
});

/**
 * Create a Stripe Checkout Session for one-time payments or subscriptions.
 *
 * POST /api/stripe/create-checkout-session
 * Body: { productName, priceCents, mode, productType, successUrl, cancelUrl, metadata?, couponCode? }
 */
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  const {
    productName,
    priceCents,
    mode = 'payment',
    successUrl,
    cancelUrl,
    metadata = {},
    couponCode,
    userId,
  } = req.body;

  if (!priceCents || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Build line items for the checkout session
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            metadata,
          },
          unit_amount: priceCents,
          ...(mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      },
    ];

    // Build session params
    const sessionParams = {
      line_items: lineItems,
      mode: mode === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        user_id: userId || 'anonymous',
        product_type: metadata.product_type || 'course',
      },
      // Allow promotion codes from Stripe Dashboard
      allow_promotion_codes: true,
    };

    // Apply coupon if provided (using a Stripe coupon or directly)
    if (couponCode) {
      // In production, look up the coupon via Stripe API
      sessionParams.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('Checkout session creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a Stripe Coupon.
 *
 * POST /api/stripe/create-coupon
 * Body: { code, percentOff, duration? }
 */
app.post('/api/stripe/create-coupon', async (req, res) => {
  const { code, percentOff, duration = 'once' } = req.body;

  if (!code || !percentOff) {
    return res.status(400).json({ error: 'Missing code or percentOff' });
  }

  try {
    const coupon = await stripe.coupons.create({
      name: code.toUpperCase(),
      percent_off: percentOff,
      duration,
      id: code.toUpperCase(),
    });

    res.json({ coupon });
  } catch (err) {
    console.error('Coupon creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  🏦 Stripe API Server running on http://localhost:${PORT}`);
  console.log(`  📋 Endpoints:`);
  console.log(`     POST /api/stripe/create-checkout-session`);
  console.log(`     POST /api/stripe/create-coupon`);
  console.log(`     POST /api/stripe/webhook`);
  console.log(`     GET  /api/stripe/health`);
  console.log(`\n  ⚠️  Set STRIPE_SECRET_KEY env var for live mode.\n`);
});
