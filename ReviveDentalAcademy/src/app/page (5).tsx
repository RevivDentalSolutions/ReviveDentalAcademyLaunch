import Link from 'next/link';
import Card from '@/components/ui/Card';
import { FileText, AlertCircle, MessageSquare, Shield, ArrowRight, Clock, DollarSign, CheckCircle } from 'lucide-react';

const quickActions = [
  {
    title: 'Generate Narrative',
    description: 'Create a payer-ready insurance narrative in seconds.',
    icon: FileText,
    href: '/tools/insurance-narrative',
    color: 'mint',
  },
  {
    title: 'Fix a Denied Claim',
    description: 'Get AI guidance on next steps and appeal wording.',
    icon: AlertCircle,
    href: '/tools/claims-assistant',
    color: 'teal',
  },
  {
    title: 'Front Desk Scripts',
    description: 'Access ready-to-use scripts for patient communication.',
    icon: MessageSquare,
    href: '/tools/scripts',
    color: 'mint',
  },
  {
    title: 'Compliance & Safety',
    description: 'Download and manage office compliance templates.',
    icon: Shield,
    href: '/templates',
    color: 'charcoal',
  },
];

const recentActivity = [
  { type: 'narrative', title: 'Narrative Generated for #14', time: '2 min ago', status: 'success' },
  { type: 'claim', title: 'Appeal Draft for Claim #4592', time: '15 min ago', status: 'success' },
  { type: 'script', title: 'Script Copied: Insurance Verification', time: '1 hour ago', status: 'success' },
  { type: 'template', title: 'Radiation Safety Program Downloaded', time: '3 hours ago', status: 'success' },
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section - Dashboard Style */}
      <section className="bg-white border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal-900 mb-2">
                Welcome to Revive Office Pro
              </h1>
              <p className="text-lg text-charcoal-600 max-w-2xl">
                AI-powered tools built to help you generate narratives, fix denied claims, and keep your front desk running efficiently.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard" className="btn-primary btn-lg">
                Open Dashboard
              </Link>
              <Link href="/tools/claims-assistant" className="btn-secondary btn-lg">
                Create New Claim
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="py-6 bg-cream-100 border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
                <FileText size={20} className="text-mint-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-charcoal-900">127</div>
                <div className="text-xs text-charcoal-500">Narratives This Month</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-teal-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-charcoal-900">98%</div>
                <div className="text-xs text-charcoal-500">Claims Success Rate</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal-100 flex items-center justify-center">
                <DollarSign size={20} className="text-charcoal-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-charcoal-900">$24.5K</div>
                <div className="text-xs text-charcoal-500">Revenue Recovered</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
                <Clock size={20} className="text-mint-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-charcoal-900">18 hrs</div>
                <div className="text-xs text-charcoal-500">Time Saved This Month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">Quick Actions</h2>
            <Link href="/tools" className="text-mint-600 font-medium text-sm hover:text-mint-700 flex items-center gap-1">
              View All Tools
              <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card variant="interactive" className="h-full">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    action.color === 'mint' ? 'bg-gradient-to-br from-mint-100 to-teal-100' :
                    action.color === 'teal' ? 'bg-teal-100' :
                    'bg-charcoal-100'
                  }`}>
                    <action.icon size={24} className={
                      action.color === 'mint' ? 'text-mint-600' :
                      action.color === 'teal' ? 'text-teal-600' :
                      'text-charcoal-600'
                    } />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-charcoal-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-charcoal-600 mb-4">
                    {action.description}
                  </p>
                  <span className="text-mint-600 font-medium text-sm flex items-center gap-1">
                    Get Started
                    <ArrowRight size={14} />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="py-12 bg-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">Recent Activity</h2>
            <button className="text-charcoal-500 text-sm hover:text-charcoal-700">
              View All Activity
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="divide-y divide-charcoal-100">
              {recentActivity.map((item, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-cream-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-mint-100 flex items-center justify-center">
                      <CheckCircle size={16} className="text-mint-600" />
                    </div>
                    <div>
                      <p className="font-medium text-charcoal-900">{item.title}</p>
                      <p className="text-xs text-charcoal-500">{item.time}</p>
                    </div>
                  </div>
                  <span className="badge badge-mint">Completed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pro Tips Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-mint-50 to-teal-50 border-mint-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Shield size={24} className="text-mint-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-charcoal-900 mb-1">
                  Pro Tip: Radiation Safety Inspections
                </h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">
                  Your next radiation safety inspection is due in 14 days. Download the Radiation Safety Program template to ensure your office is fully compliant and audit-ready.
                </p>
                <Link href="/tools/radiation-safety" className="text-mint-600 font-medium text-sm mt-2 inline-flex items-center gap-1 hover:text-mint-700">
                  Generate Program
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
