import { useState } from 'react';
import { Search, BookOpen, ShieldCheck, ChevronRight, Star, ArrowRight, FileText, Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ResourceCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const { profile } = useAuthStore();
  
  const isPro = profile?.role === 'member' || profile?.role === 'admin';

  const categories = ['All', 'Insurance', 'Billing', 'Compliance', 'Operations', 'Patient Care'];

  const resources = [
    {
      id: '1',
      title: "Mastering the 2024 CDT Code Updates",
      category: "Insurance",
      excerpt: "Deep dive into the latest coding changes and how to ensure your claims aren't rejected due to outdated codes.",
      date: "June 12, 2024",
      readTime: "8 min read",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2070&auto=format&fit=crop",
      featured: true,
      premium: false
    },
    {
      id: '2',
      title: "The Ultimate AR Cleanup Checklist",
      category: "Billing",
      excerpt: "Step-by-step guide to tackling aged receivables and getting your cash flow back on track.",
      date: "June 05, 2024",
      readTime: "12 min read",
      image: "https://images.unsplash.com/photo-1454165833767-131f36967718?q=80&w=2070&auto=format&fit=crop",
      featured: true,
      premium: true
    },
    {
      id: '3',
      title: "How to Explain PPO Deductibles to Patients",
      category: "Patient Care",
      excerpt: "Scripts and strategies for handling patient objections regarding out-of-pocket costs.",
      date: "May 28, 2024",
      readTime: "5 min read",
      premium: false
    },
    {
      id: '4',
      title: "Credentialing 101: Staying Compliant",
      category: "Compliance",
      excerpt: "Avoid common pitfalls in the provider credentialing process with our compliance roadmap.",
      date: "May 22, 2024",
      readTime: "10 min read",
      premium: true
    },
    {
      id: '5',
      title: "Morning Huddle SOP Template",
      category: "Operations",
      excerpt: "A high-conversion morning huddle script that aligns your clinical and admin teams.",
      date: "May 15, 2024",
      readTime: "4 min read",
      premium: true
    }
  ];

  const featured = resources.filter(r => r.featured);
  const others = resources.filter(r => !r.featured && (activeCategory === 'All' || r.category === activeCategory));

  return (
    <div className="bg-primary min-h-screen pt-32 pb-24 font-sans text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="relative mb-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-8">
            <BookOpen className="h-4 w-4 text-secondary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">The Knowledge Base</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
            Consulting-Grade <span className="text-secondary">Resources</span>
          </h1>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            Expert articles, downloadable SOP snippets, and quick-reference guides designed to help your dental office operate at peak efficiency.
          </p>

          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search for articles, guides, or SOPs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-full py-5 pl-16 pr-8 text-white focus:outline-none focus:border-secondary/50 transition-all text-lg shadow-2xl backdrop-blur-md"
            />
          </div>
        </div>

        {/* Featured Section */}
        <section className="mb-24">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Featured Insights</h2>
            <div className="h-[1px] flex-grow bg-white/5 mx-8" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featured.map((resource) => (
              <div key={resource.id} className="group relative rounded-3xl overflow-hidden bg-[#1A1F26] border border-white/5 hover:border-secondary/30 transition-all duration-500 flex flex-col md:flex-row h-full shadow-xl">
                <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
                  <img src={resource.image} alt={resource.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-primary/90 to-transparent opacity-60" />
                </div>
                <div className="p-8 md:w-1/2 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1 rounded-full">{resource.category}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{resource.readTime}</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mb-4 leading-tight group-hover:text-secondary transition-colors">{resource.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8 line-clamp-3">{resource.excerpt}</p>
                  <button className="flex items-center gap-2 text-secondary font-bold text-sm group-hover:gap-3 transition-all">
                    Read Article <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {resource.premium && (
                  <div className="absolute top-4 right-4 bg-secondary text-primary p-2 rounded-full shadow-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main List */}
          <div className="lg:w-2/3">
            <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-8 py-3 rounded-full text-sm font-bold transition-all ${
                    activeCategory === cat 
                      ? 'bg-secondary text-primary' 
                      : 'bg-white/[0.03] text-gray-400 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {others.map((resource) => (
                <div key={resource.id} className="group bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl p-6 transition-all duration-300 flex items-center justify-between gap-6 cursor-pointer">
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{resource.category}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{resource.date}</span>
                    </div>
                    <h4 className="text-xl font-bold tracking-tight group-hover:text-secondary transition-colors mb-2">{resource.title}</h4>
                    <p className="text-gray-500 text-sm line-clamp-1">{resource.excerpt}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-4">
                    {resource.premium && <ShieldCheck className="h-5 w-5 text-secondary/40" />}
                    <div className="p-3 rounded-xl bg-white/5 group-hover:bg-secondary/10 transition-colors">
                      <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-secondary transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-12 py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-gray-500 font-bold text-sm hover:text-white hover:border-white/20 transition-all">
              Load More Resources
            </button>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-12">
            {/* Quick SOPs */}
            <div className="bg-[#1A1F26] rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText className="h-24 w-24" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-8 relative z-10">Quick-Reference SOPs</h3>
              <div className="space-y-6 relative z-10">
                {[
                  "Insurance Verification Checklist",
                  "End-of-Day Financial Protocol",
                  "Patient Dismissal Guidelines",
                  "Secondary Claims Narrative"
                ].map((sop, i) => (
                  <div key={i} className="flex items-center justify-between group/item cursor-pointer">
                    <span className="text-gray-400 text-sm group-hover/item:text-secondary transition-colors">{sop}</span>
                    <Download className="h-4 w-4 text-gray-700 group-hover/item:text-secondary" />
                  </div>
                ))}
              </div>
              <button className="w-full mt-10 py-4 bg-secondary/10 text-secondary font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-secondary/20 transition-all border border-secondary/20">
                Access Template Library
              </button>
            </div>

            {/* Newsletter / CTA */}
            <div className="bg-gradient-to-br from-secondary/20 to-primary rounded-3xl p-8 border border-secondary/20 shadow-2xl">
              <Star className="h-8 w-8 text-secondary mb-6" />
              <h3 className="text-2xl font-bold tracking-tight mb-4">Level Up Your Office</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Get the latest insurance tactics and operations guides delivered to your inbox every week.
              </p>
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Your office email..." 
                  className="w-full bg-primary/50 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-secondary/50 transition-all"
                />
                <button className="btn-glow w-full bg-secondary text-primary font-bold py-4 rounded-xl transition-all">
                  Subscribe for Free
                </button>
              </div>
            </div>
            
            {/* Pro Sidebar Link */}
            {!isPro && (
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center">
                <h4 className="text-white font-bold mb-4">Unlock Premium Content</h4>
                <p className="text-gray-500 text-xs mb-6">Gain access to our full library of 500+ articles, templates, and consulting SOPs.</p>
                <button className="text-secondary text-sm font-bold hover:underline">View Pro Benefits</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCenter;
