import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { FileText, Download, Shield, ClipboardList, AlertTriangle, Users, DollarSign, Calendar } from 'lucide-react';

const templates = [
  {
    id: 'insurance-checklist',
    title: 'Insurance Verification Checklist',
    description: 'Comprehensive checklist for verifying patient insurance before appointments.',
    category: 'Insurance',
    icon: DollarSign,
    downloads: 1247,
    premium: false,
    format: 'PDF',
  },
  {
    id: 'radiation-training-log',
    title: 'Radiation Safety Training Log',
    description: 'Track staff radiation safety training completion and certifications.',
    category: 'Compliance',
    icon: ClipboardList,
    downloads: 892,
    premium: false,
    format: 'PDF',
  },
  {
    id: 'incident-report',
    title: 'Radiation Incident Report Form',
    description: 'Document and report any radiation-related incidents or exposures.',
    category: 'Compliance',
    icon: AlertTriangle,
    downloads: 654,
    premium: true,
    format: 'PDF',
  },
  {
    id: 'patient-intake',
    title: 'Patient Medical History Form',
    description: 'Standard medical history and consent form for new patients.',
    category: 'Patient Care',
    icon: FileText,
    downloads: 2103,
    premium: false,
    format: 'PDF',
  },
  {
    id: 'staff-training-record',
    title: 'Staff Training Record',
    description: 'Track continuing education and training for all staff members.',
    category: 'HR',
    icon: Users,
    downloads: 789,
    premium: false,
    format: 'PDF',
  },
  {
    id: 'equipment-maintenance',
    title: 'X-Ray Equipment Maintenance Log',
    description: 'Log equipment inspections, calibrations, and maintenance activities.',
    category: 'Equipment',
    icon: Shield,
    downloads: 567,
    premium: true,
    format: 'PDF',
  },
  {
    id: 'appointment-reminder',
    title: 'Appointment Reminder Templates',
    description: 'Ready-to-use phone and text message templates for appointment reminders.',
    category: 'Patient Care',
    icon: Calendar,
    downloads: 1532,
    premium: false,
    format: 'TXT',
  },
  {
    id: 'claim-tracking',
    title: 'Insurance Claim Tracking Sheet',
    description: 'Track claim status, submission dates, and follow-up activities.',
    category: 'Insurance',
    icon: DollarSign,
    downloads: 1089,
    premium: false,
    format: 'PDF',
  },
];

const categories = ['All', 'Insurance', 'Compliance', 'Patient Care', 'HR', 'Equipment'];

export default function TemplatesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-100 to-teal-100 flex items-center justify-center">
            <Download size={24} className="text-mint-600" />
          </div>
          <div>
            <h1 className="section-title mb-0">Downloadable Templates</h1>
            <p className="text-charcoal-600 mt-1">High-quality forms and documents for your dental practice</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category, index) => (
          <button
            key={category}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              index === 0 
                ? 'bg-charcoal-900 text-white' 
                : 'bg-white text-charcoal-700 hover:bg-cream-100 border border-charcoal-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} variant="interactive" className="flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                template.premium 
                  ? 'bg-gradient-to-br from-amber-100 to-orange-100' 
                  : 'bg-gradient-to-br from-mint-100 to-teal-100'
              }`}>
                <template.icon size={24} className={template.premium ? 'text-amber-600' : 'text-mint-600'} />
              </div>
              <div className="flex items-center gap-2">
                {template.premium && <Badge variant="charcoal">Premium</Badge>}
                <Badge variant="mint">{template.format}</Badge>
              </div>
            </div>
            
            <h3 className="font-display font-semibold text-lg text-charcoal-900 mb-2">
              {template.title}
            </h3>
            
            <p className="text-sm text-charcoal-600 mb-4 flex-1">
              {template.description}
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-charcoal-100">
              <div className="text-xs text-charcoal-500">
                <span className="font-medium text-charcoal-700">{template.downloads.toLocaleString()}</span> downloads
              </div>
              <button className="btn-accent btn-sm">
                <Download size={14} className="mr-1" />
                Download
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Premium Banner */}
      <div className="mt-12 bg-gradient-to-r from-charcoal-900 to-charcoal-800 rounded-2xl p-8 text-center">
        <h2 className="font-display text-2xl font-semibold text-white mb-3">
          Unlock All Premium Templates
        </h2>
        <p className="text-charcoal-400 mb-6 max-w-lg mx-auto">
          Get access to all templates including incident reports, equipment maintenance logs, and more.
        </p>
        <button className="btn-accent btn-lg">
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}
