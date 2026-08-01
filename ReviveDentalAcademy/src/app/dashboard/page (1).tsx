import { db } from '@/lib/db';
import Card from '@/components/ui/Card';
import { Claim, FollowUp } from '@/types/database';
import { 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ArrowUpRight,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';

async function getDashboardData() {
  const claimsResult = await db.execute('SELECT * FROM claims');
  const followUpsResult = await db.execute('SELECT * FROM follow_ups');
  
  const claims = claimsResult.rows as unknown as Claim[];
  const followUps = followUpsResult.rows as unknown as FollowUp[];

  const unpaidTotal = claims
    .filter(c => c.status !== 'paid')
    .reduce((sum, c) => sum + (c.amount as number), 0);
  
  const missingInfoCount = claims.filter(c => c.missing_info).length;
  const deniedCount = claims.filter(c => c.status === 'denied').length;
  const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;

  return {
    claims,
    followUps,
    unpaidTotal,
    missingInfoCount,
    deniedCount,
    pendingFollowUps
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="page-container">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="section-title mb-1">Revenue Optimization Dashboard</h1>
          <p className="section-subtitle mb-0">Track your office performance and take action on outstanding claims.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <PlusCircle size={18} />
            New Claim
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight size={12} />
              12%
            </span>
          </div>
          <div>
            <p className="text-sm text-charcoal-500 font-medium uppercase tracking-wider">Unpaid Claims</p>
            <h3 className="text-2xl font-bold text-charcoal-900 mt-1">
              ${data.unpaidTotal.toLocaleString()}
            </h3>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-mint-50 text-mint-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm text-charcoal-500 font-medium uppercase tracking-wider">Missing Info</p>
            <h3 className="text-2xl font-bold text-charcoal-900 mt-1">
              {data.missingInfoCount}
            </h3>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-charcoal-50 text-charcoal-600 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm text-charcoal-500 font-medium uppercase tracking-wider">Pending Follow-ups</p>
            <h3 className="text-2xl font-bold text-charcoal-900 mt-1">
              {data.pendingFollowUps}
            </h3>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm text-charcoal-500 font-medium uppercase tracking-wider">Denied Claims</p>
            <h3 className="text-2xl font-bold text-charcoal-900 mt-1">
              {data.deniedCount}
            </h3>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Claims List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0 border-none shadow-sm">
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-teal-500" />
                Recent Claims
              </h2>
              <Link href="#" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-cream-50 text-charcoal-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Carrier</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50">
                  {data.claims.map((claim) => (
                    <tr key={String(claim.id)} className="hover:bg-cream-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-charcoal-900">{claim.patient_name}</div>
                        <div className="text-xs text-charcoal-500">#{claim.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-600">{claim.carrier}</td>
                      <td className="px-6 py-4 text-sm font-medium text-charcoal-900">${(claim.amount as number).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          claim.status === 'paid' ? 'bg-mint-100 text-mint-800' :
                          claim.status === 'denied' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {claim.status === 'paid' && <CheckCircle2 size={12} />}
                          {claim.status === 'denied' && <AlertCircle size={12} />}
                          {claim.status === 'pending' && <Clock size={12} />}
                          {String(claim.status).charAt(0).toUpperCase() + String(claim.status).slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action Suggestions Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2 px-2">
              <ArrowUpRight size={20} className="text-teal-500" />
              Suggested Action Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.claims.filter(c => c.status !== 'paid').map((claim) => (
                <Card key={String(claim.id)} variant="accent" className="border-l-4 border-l-teal-500">
                  <h3 className="font-bold text-charcoal-900 text-sm mb-1">{claim.patient_name} - {claim.carrier}</h3>
                  <p className="text-xs text-charcoal-600 mb-3 italic">
                    {claim.status === 'denied' ? `Denied: ${claim.denial_reason}` : claim.missing_info ? `Missing: ${claim.missing_info}` : 'Awaiting processing'}
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-teal-100 mb-3">
                    <p className="text-sm font-medium text-teal-900">
                      {claim.status === 'denied' ? 'Generate an appeal narrative focusing on clinical necessity.' : 
                       claim.missing_info ? 'Contact patient/provider to obtain missing X-rays/documentation.' : 
                       'Follow up with carrier if processing takes > 14 days.'}
                    </p>
                  </div>
                  <Link 
                    href={claim.status === 'denied' ? '/tools/claims-assistant' : '/tools/insurance-narrative'} 
                    className="flex items-center justify-between text-xs font-bold text-teal-600 hover:text-teal-700 uppercase tracking-tight"
                  >
                    Use AI Tool for this
                    <ChevronRight size={14} />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Follow-ups */}
        <div className="space-y-6">
          <Card className="h-full">
            <h2 className="text-lg font-bold text-charcoal-900 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-teal-500" />
              Active Follow-ups
            </h2>
            <div className="space-y-4">
              {data.followUps.map((f) => (
                <div key={String(f.id)} className="p-4 rounded-xl border border-charcoal-100 hover:border-teal-200 transition-colors group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-bold text-charcoal-800 leading-tight">
                      {f.task_description}
                    </div>
                    <div className={`shrink-0 h-2 w-2 rounded-full ${f.status === 'pending' ? 'bg-orange-500' : 'bg-mint-500'}`} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">
                      Due: {new Date(f.due_date as string).toLocaleDateString()}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 text-xs font-bold text-teal-600 hover:text-teal-700 transition-opacity">
                      Mark Done
                    </button>
                  </div>
                </div>
              ))}
              
              {data.followUps.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-charcoal-400 text-sm">No pending follow-ups</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-6 py-3 border-2 border-dashed border-charcoal-200 rounded-xl text-charcoal-500 text-sm font-medium hover:border-teal-300 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
              <PlusCircle size={16} />
              Add Reminder
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
