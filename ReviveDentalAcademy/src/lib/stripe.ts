import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<any> | null = null

/**
 * Get or initialize the Stripe instance for client-side usage.
 */
export function getStripe() {
  if (!stripePromise) {
    if (!stripePublishableKey) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set. Stripe will not be available.')
      return null
    }
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

// ============================================================
// Price / Product IDs (configured in Stripe Dashboard)
// These should match the Price IDs from your Stripe account
// ============================================================

export const STRIPE_PRICES = {
  officeProMonthly: 'price_office_pro_monthly',   // Replace with actual Stripe Price ID
  dentalInsuranceBootcamp: 'price_bootcamp',        // Replace with actual Stripe Price ID
} as const

// ============================================================
// Coupon / Discount Types
// ============================================================

export interface CouponInfo {
  code: string
  discountPercent: number
  discountAmount: number // in cents
  description: string
  valid: boolean
}

/**
 * In-memory coupon store (in production, validate on the server).
 * These are demo coupons for the launch.
 */
export const DEMO_COUPONS: Record<string, Omit<CouponInfo, 'code' | 'valid'>> = {
  'LAUNCH20': {
    discountPercent: 20,
    discountAmount: 0,
    description: '20% off launch special',
  },
  'PRO100': {
    discountPercent: 0,
    discountAmount: 10000, // $100.00
    description: '$100 off Office Pro annual plan',
  },
  'FREEMONTH': {
    discountPercent: 0,
    discountAmount: 14900, // $149.00 = 1 month free
    description: 'First month of Office Pro free',
  },
}

/**
 * Validate and look up a coupon code.
 * In production, this would call your backend/Stripe API.
 */
export function validateCoupon(code: string): CouponInfo | null {
  const upperCode = code.toUpperCase().trim()
  const coupon = DEMO_COUPONS[upperCode]

  if (!coupon) return null

  return {
    code: upperCode,
    ...coupon,
    valid: true,
  }
}

/**
 * Calculate the final amount after applying a coupon.
 */
export function applyCoupon(
  baseAmountCents: number,
  coupon: CouponInfo | null
): { finalAmount: number; discount: number; description: string } {
  if (!coupon) {
    return { finalAmount: baseAmountCents, discount: 0, description: '' }
  }

  let discount = 0

  if (coupon.discountPercent > 0) {
    discount = Math.round((baseAmountCents * coupon.discountPercent) / 100)
  } else if (coupon.discountAmount > 0) {
    discount = Math.min(coupon.discountAmount, baseAmountCents)
  }

  return {
    finalAmount: baseAmountCents - discount,
    discount,
    description: coupon.description,
  }
}

/**
 * Format cents to a display price string.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format a display price from a dollar-amount string like "$149".
 */
export function priceToCents(priceString: string): number {
  const numeric = parseFloat(priceString.replace(/[^0-9.]/g, ''))
  return Math.round(numeric * 100)
}
