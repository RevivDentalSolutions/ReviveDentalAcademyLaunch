import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Sparkles, HelpCircle, ShieldAlert, MessageSquare, BarChart3, FileDown } from 'lucide-react';

const tools = [
  {
    id: 'insurance-narrative',
    title: 'AI Insurance Narrative Generator',
    description: 'Generate professional clinical narratives for insurance claims.',
    icon: <Sparkles size={24} />,
    href: '/tools/insurance-narrative',
    status: 'active',
  },
  {
    id: 'claims-assistant',
    title: 'Claims Troubleshooting Assistant',
    description: 'AI suggests next steps and appeal wording for denied claims.',
    icon: <HelpCircle size={24} />,
    href: '/tools/claims-assistant',
    status: 'active',
  },
  {
    id: 'radiation-safety',
    title: 'Radiation Safety Program',
    description: 'Generates a compliant radiation safety program template.',
    icon: <ShieldAlert size={24} />,
    href: '/tools/radiation-safety',
    status: 'coming-soon',
  },
  {
    id: 'front-desk-scripts',
    title: 'Front Desk Scripts',
    description: 'Scripts for scheduling, insurance verification, and more.',
    icon: <MessageSquare size={24} />,
    href: '/tools/scripts',
    status: 'active',
  },
  {
    id: 'revenue-dashboard',
    title: 'Revenue optimization',
    description: 'Track unpaid claims and missing information.',
    icon: <BarChart3 size={24} />,
    href: '/dashboard',
    status: 'active',
  },
  {
    id: 'templates',
    title: 'Downloadable Templates',
    description: 'Checklists, logs, and compliance documents.',
    icon: <FileDown size={24} />,
    href: '/templates',
    status: 'coming-soon',
  },
];

export default function ToolsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="section-title">AI Powered Dental Tools</h1>
        <p className="section-subtitle">
          Streamline your office workflows and increase collections with our specialized AI assistants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {tools.map((tool) => (
          <Link 
            key={tool.id} 
            href={tool.status === 'active' ? tool.href : '#'}
            className={tool.status === 'coming-soon' ? 'cursor-not-allowed' : ''}
          >
            <Card 
              variant={tool.status === 'active' ? 'interactive' : 'default'}
              className={`h-full flex flex-col gap-4 ${tool.status === 'coming-soon' ? 'opacity-70' : ''}`}
            >
              <div className="tool-icon">
                {tool.icon}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="tool-title mb-0">{tool.title}</h3>
                  {tool.status === 'coming-soon' && (
                    <span className="badge-charcoal">Coming Soon</span>
                  )}
                  {tool.status === 'active' && (
                    <span className="badge-mint">Active</span>
                  )}
                </div>
                <p className="tool-description">{tool.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
