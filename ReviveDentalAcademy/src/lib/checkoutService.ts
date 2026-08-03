import { validateCoupon } from './stripe'
import { supabase } from './supabase'
import { authenticatedJsonFetch } from './apiClient'

// ============================================================
// Checkout Types
// ============================================================

export type CheckoutMode = 'payment' | 'subscription'
export type CheckoutProduct = 'membership' | 'course'

export interface CheckoutConfig {
  productId: string
  productName: string
  price: string  // Display price e.g. "$149"
  priceCents: number
  mode: CheckoutMode
  productType: CheckoutProduct
  successUrl: string
  cancelUrl: string
  couponCode?: string
  metadata?: Record<string, string>
}

export interface CheckoutResult {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
}

// ============================================================
// Stripe Checkout Session Creation
// ============================================================

/**
 * This is the API URL that would handle Stripe Checkout Session creation.
 * For local dev, you'd run a small Express server or Supabase Edge Function.
 * Replace with your actual backend URL in production.
 */
const STRIPE_API_URL = import.meta.env.VITE_STRIPE_API_URL || '/api/stripe'

/**
 * Initiate a Stripe Checkout Session for either a one-time purchase or subscription.
 */
export async function createCheckoutSession(
  config: CheckoutConfig
): Promise<CheckoutResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Please sign in before checkout.' }

    // Validate coupon if provided
    if (config.couponCode) {
      const coupon = validateCoupon(config.couponCode)
      if (!coupon) {
        return { success: false, error: 'Invalid coupon code' }
      }
    }

    const response = await authenticatedJsonFetch(`${STRIPE_API_URL}/create-checkout-session`, {
      method: 'POST',
      body: JSON.stringify({
        productId: config.productId,
        productType: config.productType,
      }),
    })

    const session = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: session.error || 'Unable to start Stripe Checkout',
      }
    }

    if (!session.url) {
      return { success: false, error: 'Stripe did not return a checkout URL' }
    }

    return { success: true, sessionId: session.id, url: session.url }
  } catch (err: any) {
    console.error('Checkout session error:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================
// Upsell / Smart Prompt Helpers
// ============================================================

export interface UpsellPrompt {
  show: boolean
  title: string
  description: string
  cta: string
  savings: string
  action: 'switch_to_annual' | 'add_coupon' | 'bundle_courses'
}

/**
 * Determine if an upsell should be shown based on the current cart.
 */
export function getUpsellPrompt(
  currentProduct: CheckoutProduct,
  currentPrice: string,
  hasActiveSub: boolean
): UpsellPrompt | null {
  // If buying a course and not a member, upsell the membership
  if (currentProduct === 'course' && !hasActiveSub) {
    return {
      show: true,
      title: 'Save More with Office Pro',
      description: `Get this course PLUS all 25+ courses, 150+ templates, and monthly coaching for just $149/mo.`,
      cta: 'Switch to Office Pro',
      savings: `Save ${currentPrice}/mo`,
      action: 'switch_to_annual',
    }
  }

  // If going monthly, upsell annual
  if (currentProduct === 'membership' && currentPrice.includes('/mo')) {
    return {
      show: true,
      title: 'Go Annual & Save 20%',
      description: 'Pay yearly and get 2 months free compared to monthly billing.',
      cta: 'Switch to Annual',
      savings: 'Save $298/yr',
      action: 'switch_to_annual',
    }
  }

  // If no upsell applies
  return null
}

/**
 * Apply a coupon code to a checkout session.
 * In production, this validates on the server.
 */
export async function applyCouponToCheckout(
  sessionId: string,
  couponCode: string
): Promise<CheckoutResult> {
  const coupon = validateCoupon(couponCode)
  if (!coupon) {
    return { success: false, error: 'Invalid coupon code' }
  }

  // In production, update the Stripe Checkout Session via API
  console.log(`[Stripe] Coupon "${couponCode}" applied to session ${sessionId}`)

  return {
    success: true,
    sessionId,
    url: undefined,
  }
}
