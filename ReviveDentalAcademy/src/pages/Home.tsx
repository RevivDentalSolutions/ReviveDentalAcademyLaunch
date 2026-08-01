import { ArrowRight, Star, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/courses/CourseCard';
import MembershipCTA from '../components/ui/MembershipCTA';

const Home = () => {
  const featuredCourses = [
    {
      title: "Dental Insurance Verification Bootcamp",
      description: "The ultimate guide to mastering dental insurance verification and reducing claim denials by up to 40%.",
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2070&auto=format&fit=crop",
      duration: "4h 30m",
      lessons: 12,
      rating: 4.9,
      price: 297,
      category: "Insurance Masterclass"
    },
    {
      title: "AR Optimization Strategy",
      description: "Learn the high-level consulting strategies used to clean up messy AR and keep it under 30 days.",
      image: "https://images.unsplash.com/photo-1454165833767-131f36967718?q=80&w=2070&auto=format&fit=crop",
      duration: "3h 15m",
      lessons: 8,
      rating: 4.8,
      price: 197,
      category: "Billing"
    },
    {
      title: "Front Desk Phone Mastery",
      description: "Convert more inquiries into scheduled appointments with our high-conversion phone script system.",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
      duration: "2h 45m",
      lessons: 10,
      rating: 5.0,
      price: 147,
      category: "Communication"
    }
  ];

  return (
    <div className="bg-primary text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-secondary/30 blur-[150px] rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-8 animate-fade-in">
              <Star className="h-4 w-4 text-secondary fill-secondary" />
              <span className="text-xs font-bold uppercase tracking-widest text-secondary">The New Standard in Dental Training</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8">
              Elevate Your <span className="text-secondary">Office Workflow</span> with Expert Training.
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed max-w-3xl mx-auto">
              Revive Dental Academy provides premium, practical insurance training and high-value administrative resources specifically designed for high-growth dental practices.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                to="/courses" 
                className="btn-glow bg-secondary text-primary px-10 py-4 rounded-full font-bold text-lg w-full sm:w-auto"
              >
                Explore Course Library
              </Link>
              <Link 
                to="/membership" 
                className="text-white hover:text-secondary px-10 py-4 rounded-full font-bold text-lg border border-white/10 hover:border-secondary/50 transition-all w-full sm:w-auto"
              >
                Join Office Pro
              </Link>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
              {['Insurance', 'Billing', 'SOPs', 'Scripts'].map((item) => (
                <div key={item} className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold tracking-widest uppercase">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold tracking-tight mb-6">Signature Bootcamps</h2>
              <p className="text-gray-400 leading-relaxed">
                Our bootcamps are intensive, result-oriented training programs designed to solve specific office bottlenecks and increase your bottom line.
              </p>
            </div>
            <Link to="/courses" className="flex items-center gap-2 text-secondary font-semibold hover:gap-3 transition-all mb-2">
              View All Courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCourses.map((course, i) => (
              <CourseCard key={i} {...course} />
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-[#161B21]/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: TrendingUp,
                title: "Optimize AR",
                desc: "Reduce insurance aging and ensure every dollar you're owed is collected efficiently."
              },
              {
                icon: ShieldCheck,
                title: "Reduce Denials",
                desc: "Master verification protocols that prevent claim rejections before they even happen."
              },
              {
                icon: Users,
                title: "Empower Your Team",
                desc: "Turn your front desk into a high-performance administrative engine with specialized SOPs."
              }
            ].map((benefit, i) => (
              <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="p-4 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
                  <benefit.icon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-4">{benefit.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MembershipCTA />
        </div>
      </section>
    </div>
  );
};

export default Home;
