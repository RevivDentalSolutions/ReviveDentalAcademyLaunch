import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MembershipCTA = () => {
  const benefits = [
    "Full Template & SOP Library",
    "Monthly Insurance Bootcamps",
    "Exclusive Appeal Letter Library",
    "Direct Access to Consulting Expert",
    "Monthly AR Optimization Training",
    "Phone Script Mastery Guides"
  ];

  return (
    <div className="relative mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D343E] to-primary border border-white/10">
      {/* Decorative Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/5 blur-[100px] rounded-full -ml-36 -mb-36" />

      <div className="relative px-8 py-16 md:px-16 md:py-20 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1">
          <div className="flex items-center gap-3 text-secondary mb-6">
            <ShieldCheck className="h-6 w-6" />
            <span className="uppercase tracking-[0.3em] text-xs font-bold font-sans">Office Pro Membership</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8 leading-tight">
            Transform Your Practice <br />
            into a <span className="text-secondary">High-Yield Machine.</span>
          </h2>

          <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-xl">
            Stop leaving money on the table. Join 500+ dental offices using Revive’s proven resources to slash denials and maximize collections.
          </p>

          <Link 
            to="/membership" 
            className="btn-glow inline-flex items-center gap-3 bg-secondary text-primary px-10 py-4 rounded-full font-bold text-lg transition-all"
          >
            Join Office Pro Today
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex-1 w-full max-w-md">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-6 text-lg">What's included:</h3>
            <ul className="space-y-4">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5" />
                  <span className="text-gray-300 text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
              <div>
                <span className="block text-gray-500 text-xs uppercase tracking-widest mb-1">Standard Rate</span>
                <span className="text-white font-bold text-2xl">$197<span className="text-sm font-normal text-gray-400">/mo</span></span>
              </div>
              <div className="text-right">
                <span className="block text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">Limited Offer</span>
                <span className="text-secondary font-bold text-xl">Save 20% Annual</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCTA;
