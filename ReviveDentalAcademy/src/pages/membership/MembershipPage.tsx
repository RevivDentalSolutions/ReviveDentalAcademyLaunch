import { useState } from 'react';
import { CheckCircle, ShieldCheck, Star, ArrowRight } from 'lucide-react';
import CheckoutModal from '../../components/ui/CheckoutModal';

const MembershipPage = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <div className="bg-charcoal min-h-screen pb-24">
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)}
        productName="Office Pro Membership"
        price="$149"
      />
      {/* Hero Header */}
      <div className="pt-20 pb-16 bg-gradient-to-b from-charcoal-dark to-charcoal border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold tracking-widest uppercase mb-6">
            Elite Access
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Office Pro Membership
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg">
            The ultimate resource vault for dental administrative excellence. Everything you need to scale your office's insurance and collections systems.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Benefits */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
                <Star className="h-6 w-6 text-brand-mint mr-3" />
                What's Included in Office Pro
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Full Course Access',
                    desc: 'Every current and future course in our library, from Insurance Verification to AR Mastery.'
                  },
                  {
                    title: 'Premium Template Vault',
                    desc: 'Locked templates, narratives, scripts, and SOPs only available to Pro members.'
                  },
                  {
                    title: 'Monthly Training Updates',
                    desc: 'Fresh training videos and resource updates every month based on industry changes.'
                  },
                  {
                    title: 'Community Access',
                    desc: 'Join our private group of dental office managers to share strategies and get answers.'
                  }
                ].map((item, i) => (
                  <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-8">Ready-to-Use SOPs</h2>
              <div className="space-y-4">
                {[
                  'Morning Huddle Excellence',
                  'New Patient Intake Protocol',
                  'Insurance Verification Workflow',
                  'End-of-Day Financial Balancing',
                  'Treatment Coordinator Hand-off'
                ].map((sop, i) => (
                  <div key={i} className="flex items-center p-4 rounded-lg bg-charcoal-light border border-white/5">
                    <CheckCircle className="h-5 w-5 text-brand-mint mr-4" />
                    <span className="text-gray-300 font-medium">{sop}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Pricing Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-charcoal-light border border-brand-mint/30 rounded-2xl p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <ShieldCheck className="h-12 w-12 text-brand-teal/10" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Office Pro</h3>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-bold text-white">$149</span>
                <span className="text-gray-500 ml-2">/month</span>
              </div>
              
              <div className="space-y-4 mb-8">
                {[
                  'All 25+ Courses Included',
                  '150+ Premium Templates',
                  'Monthly Group Coaching',
                  'Certificate of Completion',
                  'No Long-term Contract'
                ].map((feature, i) => (
                  <div key={i} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-brand-mint mt-1 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-4 bg-brand-teal text-charcoal font-bold rounded-lg hover:bg-brand-teal/90 transition-all mb-4 flex items-center justify-center"
              >
                Join Office Pro Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold">
                Secure 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipPage;
