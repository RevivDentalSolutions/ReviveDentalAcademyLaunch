import { 
  ShieldCheck, 
  FileText, 
  Mail, 
  Phone, 
  TrendingUp, 
  BookOpen, 
  Calendar,
  ChevronRight,
  Download,
  PlayCircle,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const OfficeProDashboard = () => {
  const { profile } = useAuthStore();

  const sections = [
    {
      title: "Insurance Verification",
      icon: ShieldCheck,
      count: "12 Assets",
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Appeal Letters",
      icon: Mail,
      count: "25 Templates",
      color: "text-secondary",
      bg: "bg-secondary/10"
    },
    {
      title: "Narrative Library",
      icon: BookOpen,
      count: "18 Guides",
      color: "text-purple-400",
      bg: "bg-purple-400/10"
    },
    {
      title: "Phone Scripts",
      icon: Phone,
      count: "15 Scripts",
      color: "text-orange-400",
      bg: "bg-orange-400/10"
    },
    {
      title: "AR Resources",
      icon: TrendingUp,
      count: "9 Tools",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10"
    },
    {
      title: "Downloadable SOPs",
      icon: FileText,
      count: "40+ SOPs",
      color: "text-rose-400",
      bg: "bg-rose-400/10"
    }
  ];

  const trainingUpdates = [
    {
      title: "New 2024 CDT Code Changes",
      date: "June 2024",
      duration: "45 min",
      type: "Video Training"
    },
    {
      title: "Handling Dual Insurance Coordination",
      date: "May 2024",
      duration: "30 min",
      type: "Masterclass"
    },
    {
      title: "Cleaning up 'Unapplied Credits' in Dentrix",
      date: "April 2024",
      duration: "20 min",
      type: "Technical Guide"
    }
  ];

  return (
    <div className="bg-primary min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-secondary text-[10px] font-bold uppercase tracking-[0.2em]">Active Pro Subscriber</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Member'}
            </h1>
          </div>
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl text-sm font-semibold transition-all">
            <Calendar className="h-4 w-4 text-secondary" />
            Schedule Consulting Session
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Resource Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((section, i) => (
                <div 
                  key={i} 
                  className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-secondary/30 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${section.bg}`}>
                      <section.icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{section.count}</span>
                  </div>
                  <h3 className="text-white font-bold tracking-tight text-xl mb-2 group-hover:text-secondary transition-colors">{section.title}</h3>
                  <div className="flex items-center text-gray-500 text-xs gap-1 group-hover:text-gray-400 transition-colors">
                    Access library <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Quick Actions / Files */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white">Recently Used Resources</h2>
                <button className="text-secondary text-xs font-bold uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {[
                  "SRP Medical Necessity Narrative.docx",
                  "Crown Pre-Auth Form.pdf",
                  "Broken Appointment Script.pdf"
                ].map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-gray-500 group-hover:text-secondary transition-colors" />
                      <span className="text-gray-300 text-sm font-medium">{file}</span>
                    </div>
                    <button className="p-2 hover:bg-secondary/10 rounded-lg transition-colors">
                      <Download className="h-4 w-4 text-secondary" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Training Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-[#1A1F26] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <PlayCircle className="h-6 w-6 text-secondary" />
                <h2 className="text-xl font-bold tracking-tight text-white">Monthly Training</h2>
              </div>
              
              <div className="space-y-8">
                {trainingUpdates.map((update, i) => (
                  <div key={i} className="relative pl-6 border-l border-white/5 hover:border-secondary transition-colors group">
                    <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-white/10 group-hover:bg-secondary transition-colors" />
                    <span className="block text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">{update.date}</span>
                    <h4 className="text-white font-medium mb-1 group-hover:text-secondary transition-colors">{update.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{update.type}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span>{update.duration}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-10 py-4 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 rounded-2xl text-secondary font-bold text-sm transition-all flex items-center justify-center gap-2">
                Browse Training Archive
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            {/* Support Box */}
            <div className="bg-gradient-to-br from-secondary/10 to-transparent border border-white/5 rounded-3xl p-8">
              <h3 className="text-white font-bold mb-3">Need Help?</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Your Office Pro membership includes priority email support for any insurance-related questions.
              </p>
              <a href="mailto:pro@revivedental.com" className="block text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white transition-all">
                Contact Pro Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeProDashboard;
