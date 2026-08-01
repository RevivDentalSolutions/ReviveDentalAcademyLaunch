import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Star, ArrowRight, Lock } from 'lucide-react';

interface CourseCardProps {
  id?: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  lessons: number;
  rating: number;
  price: number;
  category: string;
  isLocked?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  image,
  duration,
  lessons,
  rating,
  price,
  category,
  isLocked = false
}) => {
  const navigate = useNavigate();

  const handleAction = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      navigate('/membership');
    }
  };

  const CardContent = (
    <div className={`group bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:bg-white/[0.06] hover:border-secondary/30 hover:translate-y-[-4px] flex flex-col h-full ${isLocked ? 'grayscale opacity-80' : ''}`}>
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent opacity-60" />
        
        <div className="absolute top-4 left-4">
          <span className="bg-secondary/90 backdrop-blur-md text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {category}
          </span>
        </div>

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/40 backdrop-blur-[2px]">
            <div className="bg-primary/80 p-3 rounded-full border border-white/20">
              <Lock className="h-6 w-6 text-secondary" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center space-x-1 mb-3 text-secondary">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-secondary' : 'opacity-30'}`} />
          ))}
          <span className="text-gray-400 text-xs ml-1">({rating})</span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-white mb-2 leading-tight group-hover:text-secondary transition-colors">
          {title}
        </h3>
        
        <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-6 pb-6 border-b border-white/5">
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-secondary/60" />
              {duration}
            </div>
            <div className="flex items-center">
              <BookOpen className="h-3.5 w-3.5 mr-1.5 text-secondary/60" />
              {lessons} Lessons
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">${price}</span>
              <span className="text-gray-500 text-xs ml-1">USD</span>
            </div>
            <button 
              onClick={handleAction}
              className={`flex items-center gap-2 text-sm font-semibold transition-all ${isLocked ? 'text-secondary hover:underline' : 'text-secondary hover:gap-3'}`}
            >
              {isLocked ? 'Unlock with Pro' : 'Enroll Now'}
              {!isLocked && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLocked || !id) {
    return CardContent;
  }

  return (
    <Link to={`/course-player/${id}`} className="block h-full">
      {CardContent}
    </Link>
  );
};

export default CourseCard;
