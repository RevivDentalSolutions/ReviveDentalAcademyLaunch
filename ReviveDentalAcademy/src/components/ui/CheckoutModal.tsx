import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CreditCard, Lock, Gift, CheckCircle, Loader, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import {
  validateCoupon,
  applyCoupon,
  formatPrice,
  priceToCents,
  type CouponInfo,
} from '../../lib/stripe';
import {
  createCheckoutSession,
  getUpsellPrompt,
  type CheckoutConfig,
  type UpsellPrompt,
} from '../../lib/checkoutService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  price: string;
  productId?: string;
  productType?: 'membership' | 'course';
  mode?: 'payment' | 'subscription';
}

function toReadableString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ============================================================
// Checkout Form Component
// ============================================================

const CheckoutForm: React.FC<{
  productName: string;
  price: string;
  priceCents: number;
  productId: string;
  productType: 'membership' | 'course';
  mode: 'payment' | 'subscription';
}> = ({ productName, price, priceCents, productId, productType, mode }) => {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upsell, setUpsell] = useState<UpsellPrompt | null>(null);

  const { finalAmount, discount } = applyCoupon(priceCents, appliedCoupon);

  useEffect(() => {
    // Show upsell if applicable
    if (productType === 'course' && isAuthenticated) {
      setUpsell(getUpsellPrompt(productType, price, false));
    } else if (mode === 'subscription') {
      setUpsell(getUpsellPrompt(productType, price, false));
    }
  }, [productType, price, mode, isAuthenticated]);

  function handleApplyCoupon() {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    const coupon = validateCoupon(couponCode);
    if (!coupon) {
      setCouponError('Invalid coupon code');
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponError(null);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isAuthenticated) {
        setError('Please sign in to complete your purchase.');
        setLoading(false);
        return;
      }

      const config: CheckoutConfig = {
        productId,
        productName,
        price,
        priceCents: finalAmount,
        mode,
        productType,
        successUrl: window.location.origin + '/courses?payment=success',
        cancelUrl: window.location.origin,
        couponCode: appliedCoupon?.code,
        metadata: { product_id: productId },
      };

      const result = await createCheckoutSession(config);

      if (!result.success) {
        setError(toReadableString(result.error, 'Payment failed. Please try again.'));
        setLoading(false);
        return;
      }

      if (!result.url) {
        setError('Stripe did not return a checkout URL.');
        setLoading(false);
        return;
      }

      window.location.assign(result.url);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6">
      {/* Product Summary */}
      <div className="flex justify-between items-center pb-6 border-b border-white/5">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Product</p>
          <p className="text-white font-bold">{productName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-white font-bold text-xl">{formatPrice(finalAmount)}</p>
          {discount > 0 && (
            <p className="text-xs text-green-500 line-through">{formatPrice(priceCents)}</p>
          )}
        </div>
      </div>

      {/* Coupon Code */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
          <Gift className="h-3 w-3 mr-1.5" />
          Coupon Code
        </label>
        {appliedCoupon ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-400 text-sm font-medium">{appliedCoupon.code}</span>
              <span className="text-green-500/70 text-xs">({appliedCoupon.description})</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-xs text-gray-400 hover:text-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter code"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm placeholder-gray-600 focus:border-brand-mint/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/15 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
        {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
      </div>

      {/* Upsell Prompt */}
      {upsell?.show && (
        <div className="bg-gradient-to-r from-brand-teal/5 to-brand-mint/5 border border-brand-teal/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-brand-teal/10 text-brand-teal flex-shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{upsell.title}</p>
              <p className="text-gray-400 text-xs mt-1">{upsell.description}</p>
              <p className="text-brand-mint text-xs font-bold mt-1">{upsell.savings}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Card Element */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Card Information
        </label>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-gray-300">
            {/* Stripe Elements CardElement would go here in production */}
            <div className="flex items-center space-x-3 text-sm">
              <CreditCard className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                className="bg-transparent border-none focus:ring-0 text-white w-full placeholder-gray-600"
                readOnly
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <input
                type="text"
                placeholder="MM / YY"
                className="bg-transparent border border-white/5 rounded px-3 py-2 text-white text-sm placeholder-gray-600"
                readOnly
              />
              <input
                type="text"
                placeholder="CVC"
                className="bg-transparent border border-white/5 rounded px-3 py-2 text-white text-sm placeholder-gray-600"
                readOnly
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              In production, Stripe Elements renders secure card inputs here.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-brand-teal text-charcoal font-bold rounded-lg hover:bg-brand-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
      >
        {loading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <span>Pay {formatPrice(finalAmount)}</span>
          </>
        )}
      </button>

      {!isAuthenticated && (
        <p className="text-center text-xs text-amber-500">
          Please <a href="/login" className="underline font-medium">sign in</a> before completing your purchase.
        </p>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-4 pt-4">
        <ShieldCheck className="h-10 w-10 text-gray-700" />
        <p className="text-[10px] text-gray-500 max-w-[200px] leading-tight">
          Your payment is encrypted and processed by Stripe. We never store your credit card details.
        </p>
      </div>
    </form>
  );
};

// ============================================================
// Checkout Modal Wrapper Component
// ============================================================

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  productName,
  price,
  productId = 'default',
  productType = 'membership',
  mode = 'subscription',
}) => {
  const priceCents = priceToCents(price);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-charcoal-light border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-charcoal-light z-10">
              <h3 className="text-white font-bold text-lg flex items-center">
                <CreditCard className="h-5 w-5 mr-3 text-brand-mint" />
                Secure Checkout
              </h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Checkout Form */}
            <CheckoutForm
              productName={productName}
              price={price}
              priceCents={priceCents}
              productId={productId}
              productType={productType}
              mode={mode}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
