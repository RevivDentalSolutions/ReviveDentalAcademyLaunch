import { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Shield, Loader2 } from 'lucide-react';
import CourseCard from '../../components/courses/CourseCard';
import { getCourses, hasActiveSubscription, type Course } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const CourseLibrary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  const [hasOfficeProSubscription, setHasOfficeProSubscription] = useState(false);
  const hasOfficeProAccess = profile?.role === 'admin' || hasOfficeProSubscription;

  const categories = ['All', 'Insurance', 'Billing', 'Management', 'Communication'];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        const activeSubscription = profile ? await hasActiveSubscription() : false;
        setCourses(data);
        setHasOfficeProSubscription(activeSubscription);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setLoading(false);
      }
    };
    fetchCourses();
  }, [profile]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = activeCategory === 'All' || course.level.toLowerCase() === activeCategory.toLowerCase(); // Using level as category fallback if category missing
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-primary min-h-screen pt-32 pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
            <BookOpen className="h-4 w-4 text-secondary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">The Academy Catalog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">Master Your Office Workflows</h1>
          <p className="text-gray-400">Practical, expert-led courses designed for immediate implementation in your dental practice.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-full py-3 pl-12 pr-6 text-white focus:outline-none focus:border-secondary/50 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-500 mr-2" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat 
                    ? 'bg-secondary text-primary font-bold' 
                    : 'bg-white/[0.03] text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="h-12 w-12 text-secondary animate-spin" />
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <CourseCard 
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description || ''}
                image={course.image_url || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2070&auto=format&fit=crop'}
                duration={course.duration || '2h'}
                lessons={10} // Fallback since count not in Course interface
                rating={4.8}
                price={course.price}
                category={course.level}
                isLocked={!hasOfficeProAccess}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
            <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-xl font-medium mb-2">No courses found</h3>
            <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseLibrary;
