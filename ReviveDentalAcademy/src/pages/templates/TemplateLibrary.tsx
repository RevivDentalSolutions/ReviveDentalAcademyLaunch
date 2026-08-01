import { useState, useEffect } from 'react';
import { Download, FileText, Lock, ShieldCheck, Mail, Phone, Book, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getTemplates, hasActiveSubscription, type Template } from '../../lib/supabase';

const TemplateLibrary = () => {
  const { profile } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [hasOfficeProSubscription, setHasOfficeProSubscription] = useState(false);
  const hasOfficeProAccess = profile?.role === 'admin' || hasOfficeProSubscription;

  const categories = [
    { name: 'All', icon: Book },
    { name: 'Verification', icon: ShieldCheck },
    { name: 'Appeal Letters', icon: Mail },
    { name: 'Phone Scripts', icon: Phone },
    { name: 'SOPs', icon: FileText }
  ];

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getTemplates(activeCategory);
        const activeSubscription = profile ? await hasActiveSubscription() : false;
        setTemplates(data);
        setHasOfficeProSubscription(activeSubscription);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [activeCategory, profile]);

  return (
    <div className="bg-primary min-h-screen pt-32 pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <div className="w-full lg:w-64 space-y-8">
            <div>
              <h3 className="text-white font-bold tracking-tight text-2xl mb-6">Resource Library</h3>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setActiveCategory(cat.name);
                      setLoading(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                      activeCategory === cat.name 
                        ? 'bg-secondary/10 text-secondary border border-secondary/20 font-bold' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {!hasOfficeProAccess && (
              <div className="bg-gradient-to-br from-secondary/20 to-primary border border-secondary/20 rounded-2xl p-6">
                <Lock className="h-6 w-6 text-secondary mb-4" />
                <h4 className="text-white font-bold mb-2">Unlock Pro Templates</h4>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Get full access to our complete library of SOPs, scripts, and appeal letters.
                </p>
                <button className="w-full bg-secondary text-primary py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-transform hover:scale-[1.02]">
                  Upgrade to Office Pro
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <Loader2 className="h-12 w-12 text-secondary animate-spin" />
              </div>
            ) : templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <div 
                    key={template.id} 
                    className={`group bg-white/[0.02] border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:border-secondary/30 ${template.is_premium && !hasOfficeProAccess ? 'grayscale' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-lg bg-white/5 group-hover:bg-secondary/10 transition-colors">
                        <FileText className={`h-6 w-6 ${template.is_premium && !hasOfficeProAccess ? 'text-gray-500' : 'text-secondary'}`} />
                      </div>
                      {template.is_premium && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-[10px] font-bold text-secondary uppercase tracking-wider">
                          <Lock className="h-2.5 w-2.5" />
                          Pro
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-white font-bold tracking-tight mb-2 group-hover:text-secondary transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Resource</span>
                      <button 
                        disabled={template.is_premium && !hasOfficeProAccess}
                        className={`flex items-center gap-2 text-sm font-bold transition-all ${
                          template.is_premium && !hasOfficeProAccess 
                            ? 'text-gray-600 cursor-not-allowed' 
                            : 'text-secondary hover:gap-3'
                        }`}
                      >
                        {template.is_premium && !hasOfficeProAccess ? 'Locked' : 'Download Now'}
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                <FileText className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-white text-xl font-medium mb-2">No templates found</h3>
                <p className="text-gray-500">Try selecting a different category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
