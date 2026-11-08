import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  FileText,
  HelpCircle,
  Download,
  ChevronLeft,
  CheckCircle,
  Clock,
  ChevronRight,
  Maximize2,
  Volume2,
  Settings,
  Share2,
  Lock,
  Loader2,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { 
  getCourseWithContent, 
  getUserProgress, 
  completeLesson, 
  hasPurchasedCourse,
  hasActiveSubscription,
  type Course,
  type Module
} from '../../lib/supabase';
import { courseProgress, readQuiz } from '../../lib/courseContent';
import { LessonQuiz } from '../../components/courses/LessonQuiz';
import { useAuthStore } from '../../store/authStore';

function getVideoEmbedUrl(videoUrl: string | null | undefined): string {
  if (!videoUrl) return '';

  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
    }
    if (url.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${url.pathname.replace('/', '')}`;
    }
  } catch {
    return videoUrl;
  }

  return videoUrl;
}

function isMp4VideoUrl(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return false;

  try {
    const url = new URL(videoUrl, window.location.origin);
    return url.pathname.toLowerCase().endsWith('.mp4');
  } catch {
    return videoUrl.toLowerCase().split('?')[0].endsWith('.mp4');
  }
}

function isRefreshableSupabaseVideoSource(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return false;
  if (videoUrl.startsWith('supabase-storage://')) return true;

  try {
    const url = new URL(videoUrl, window.location.origin);
    return url.pathname.includes('/storage/v1/object/sign/lesson-videos/')
      || url.pathname.includes('/storage/v1/object/public/lesson-videos/');
  } catch {
    return false;
  }
}

async function readPlaybackError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return [parsed.error, parsed.details].filter(Boolean).join(' ');
  } catch {
    return text || `Unable to prepare lesson video playback. Status ${response.status}.`;
  }
}

const ADMIN_ONLY_LESSON_HEADINGS = new Set([
  'video script',
  'storyboard',
  'on-screen text',
  'suggested visuals',
  'video generation prompt',
  'practical training script',
  'training script',
]);

const MEMBER_FACING_LESSON_HEADINGS = new Set([
  'learning objectives',
  'lesson content',
  'key takeaway',
  'pro tip',
]);

function normalizeHeadingText(value: string) {
  return value
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getMarkdownHeading(line: string) {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
  if (!match) return null;

  return {
    level: match[1].length,
    text: match[2].trim(),
    normalizedText: normalizeHeadingText(match[2]),
  };
}

function isMarkdownHorizontalRule(line: string) {
  return /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line);
}

function containsInternalLessonMetadata(line: string) {
  const normalizedLine = line.toLowerCase();
  return [
    'supabase-storage://',
    '/storage/v1/object/sign/',
    '/storage/v1/object/public/lesson-videos/',
    'lesson-videos',
    'renderurl',
    'renderstorage',
    'renderstatus',
    'signedurl',
    'storagepath',
    'storagebucket',
    'courseid',
    'lessonid',
    'videolessonid',
    'academysettings',
  ].some((token) => normalizedLine.includes(token));
}

function removeDuplicateMarkdownSections(content: string) {
  const lines = content.split('\n');
  const output: string[] = [];
  const seenSections = new Set<string>();
  let index = 0;

  while (index < lines.length) {
    const heading = getMarkdownHeading(lines[index]);
    if (!heading) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const sectionLines = [lines[index]];
    index += 1;
    while (index < lines.length) {
      const nextHeading = getMarkdownHeading(lines[index]);
      if (nextHeading && nextHeading.level <= heading.level) break;
      sectionLines.push(lines[index]);
      index += 1;
    }

    const bodyKey = sectionLines.slice(1).join('\n').replace(/\s+/g, ' ').trim().toLowerCase();
    const sectionKey = `${heading.normalizedText}:${bodyKey}`;
    if (!seenSections.has(sectionKey)) {
      output.push(...sectionLines);
      seenSections.add(sectionKey);
    }
  }

  return output.join('\n');
}

export function sanitizeMemberLessonContent(content: string | null | undefined) {
  if (!content?.trim()) return '';

  const withoutBuilderMetadata = content
    .replace(/<!--\s*revive-video-lesson-builder[\s\S]*?revive-video-lesson-builder\s*-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const lines = withoutBuilderMetadata.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let skipHeadingLevel: number | null = null;

  for (const line of lines) {
    const heading = getMarkdownHeading(line);

    if (skipHeadingLevel !== null) {
      if (!heading || (heading.level > skipHeadingLevel && !MEMBER_FACING_LESSON_HEADINGS.has(heading.normalizedText))) {
        continue;
      }
      skipHeadingLevel = null;
    }

    if (heading && ADMIN_ONLY_LESSON_HEADINGS.has(heading.normalizedText)) {
      skipHeadingLevel = heading.level;
      continue;
    }

    if (heading && !heading.normalizedText) {
      continue;
    }

    if (isMarkdownHorizontalRule(line) || containsInternalLessonMetadata(line)) {
      continue;
    }

    output.push(line);
  }

  return removeDuplicateMarkdownSections(output.join('\n'))
    .split('\n')
    .filter((line) => !isMarkdownHorizontalRule(line) && !/^#{1,6}\s*$/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

export function renderMarkdown(content: string | null | undefined): ReactNode {
  if (!content?.trim()) {
    return <p className="text-gray-500 italic">No lesson content has been added yet.</p>;
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = renderInlineMarkdown(headingMatch[2]);
      const className = level === 1
        ? 'text-2xl font-bold text-white mt-8 mb-4'
        : level === 2
          ? 'text-xl font-bold text-white mt-7 mb-3'
          : 'text-lg font-bold text-white mt-6 mb-3';

      elements.push(level === 1
        ? <h1 key={index} className={className}>{headingText}</h1>
        : level === 2
          ? <h2 key={index} className={className}>{headingText}</h2>
          : <h3 key={index} className={className}>{headingText}</h3>
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      elements.push(
        <ul key={index} className="list-disc pl-6 space-y-2 my-5 text-gray-400">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      elements.push(
        <ol key={index} className="list-decimal pl-6 space-y-2 my-5 text-gray-400">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    elements.push(
      <p key={index} className="text-gray-400 text-lg leading-relaxed mb-5">
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <span key={lineIndex}>
            {renderInlineMarkdown(paragraphLine)}
            {lineIndex < paragraphLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return <>{elements}</>;
}

const CoursePlayer = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState('lessons');
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAuthorized(false); setCourse(null); setModules([]); setProgress([]); setLoading(true);
    setCurrentModuleIdx(0); setCurrentLessonIdx(0);
    const initPlayer = async () => {
      if (!courseId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Check authorization (purchased or Pro member)
        const isAdmin = profile?.role === 'admin';
        const hasActiveSub = await hasActiveSubscription();
        const purchased = await hasPurchasedCourse(courseId);
        
        if (cancelled) return;
        if (!isAdmin && !hasActiveSub && !purchased) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Authorization is finalized only after content loads.

        // Fetch course content
        const { course: fetchedCourse, modules: fetchedModules } = await getCourseWithContent(courseId);
        if (cancelled) return;
        setAuthorized(true);
        setCourse(fetchedCourse);
        setModules(fetchedModules);

        // Fetch user progress
        const userProgress = await getUserProgress();
        if (cancelled) return;
        setProgress(userProgress);

        setLoading(false);
      } catch (error) {
        console.error('Error initializing player:', error);
        setLoading(false);
      }
    };

    initPlayer();
    return () => { cancelled = true; };
  }, [courseId, user, profile]);

  const handleCompleteLesson = async () => {
    if (savingProgress || !modules[currentModuleIdx]?.lessons?.[currentLessonIdx]?.id) return;
    setSavingProgress(true); setProgressError('');
    
    const lessonId = modules[currentModuleIdx].lessons![currentLessonIdx].id;
    try {
      await completeLesson(lessonId);
      setProgress(prev => [...new Set([...prev, lessonId])]);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : 'Progress could not be saved. Please retry.');
    } finally { setSavingProgress(false); }
  };

  const currentLessonForPlayback = modules[currentModuleIdx]?.lessons?.[currentLessonIdx];

  useEffect(() => {
    let isMounted = true;
    const rawVideoUrl = currentLessonForPlayback?.video_url || '';

    setPlaybackError('');
    setPlaybackUrl('');

    if (!rawVideoUrl) {
      setPlaybackLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!isRefreshableSupabaseVideoSource(rawVideoUrl)) {
      setPlaybackUrl(getVideoEmbedUrl(rawVideoUrl));
      setPlaybackLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setPlaybackLoading(true);
    fetch('/api/video/lesson-playback-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: rawVideoUrl }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readPlaybackError(response));
        return response.json() as Promise<{ playbackUrl?: string }>;
      })
      .then((result) => {
        if (!isMounted) return;
        if (!result.playbackUrl) {
          throw new Error('The video server did not return a playable signed URL.');
        }
        setPlaybackUrl(result.playbackUrl);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Lesson video playback URL error:', error);
        setPlaybackError(error instanceof Error ? error.message : 'Unable to prepare this private lesson video for playback.');
      })
      .finally(() => {
        if (isMounted) setPlaybackLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentLessonForPlayback?.video_url]);

  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: <PlayCircle className="h-4 w-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="h-4 w-4" /> },
    { id: 'downloads', label: 'Downloads', icon: <Download className="h-4 w-4" /> },
    { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-secondary animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-8 text-center">
        <div className="p-6 rounded-full bg-secondary/10 mb-8 border border-secondary/20">
          <Lock className="h-12 w-12 text-secondary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-4">Access Restricted</h1>
        <p className="text-gray-400 max-w-md mb-8">
          You need an active Office Pro subscription or a one-time purchase of this course to access the training player.
        </p>
        <button 
          onClick={() => navigate('/membership')}
          className="btn-glow bg-secondary text-primary px-10 py-4 rounded-full font-bold text-lg"
        >
          Upgrade to Office Pro
        </button>
      </div>
    );
  }

  const currentLesson = currentLessonForPlayback;
  const currentVideoUrl = playbackUrl;
  const currentVideoIsMp4 = isMp4VideoUrl(playbackUrl);
  const memberLessonContent = sanitizeMemberLessonContent(currentLesson?.content);
  const progressPercent = courseProgress(modules.flatMap(m => (m.lessons || []).map(l => l.id)), progress).percent;
  const positions = modules.flatMap((m, mi) => (m.lessons || []).map((_, li) => ({ mi, li })));
  const position = positions.findIndex(p => p.mi === currentModuleIdx && p.li === currentLessonIdx);
  const moveLesson = (offset: number) => { const next = positions[position + offset]; if (next) { setCurrentModuleIdx(next.mi); setCurrentLessonIdx(next.li); } };
  const quiz = readQuiz(currentLesson?.content || '');

  return (
    <div className="bg-[#161B21] min-h-screen flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex-grow lg:max-w-[75%] bg-primary flex flex-col">
        {/* Video Player Placeholder */}
        <div className="aspect-video bg-black relative flex items-center justify-center group">
          {playbackLoading ? (
            <div className="relative z-10 text-white text-center">
              <Loader2 className="h-12 w-12 text-secondary animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-semibold">Preparing secure lesson video...</p>
            </div>
          ) : playbackError ? (
            <div className="relative z-10 max-w-lg text-center px-8">
              <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-5">
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Video Playback Unavailable</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{playbackError}</p>
            </div>
          ) : currentVideoUrl && currentVideoIsMp4 ? (
            <video
              src={currentVideoUrl}
              title={currentLesson?.title || 'Lesson video'}
              className="absolute inset-0 h-full w-full bg-black object-contain"
              controls
              playsInline
            />
          ) : currentVideoUrl ? (
            <iframe
              src={currentVideoUrl}
              title={currentLesson?.title || 'Lesson video'}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              <div className="absolute inset-0 overflow-hidden">
                {course?.image_url && (
                  <img 
                    src={course.image_url} 
                    className="w-full h-full object-cover opacity-30 blur-sm"
                    alt="Video Preview"
                  />
                )}
              </div>
              
              <div className="relative z-10 text-white text-center">
                <div className="btn-glow inline-flex p-6 rounded-full bg-secondary/20 backdrop-blur-md mb-6 cursor-pointer hover:scale-110 transition-transform duration-300">
                  <PlayCircle className="h-16 w-16 text-secondary fill-secondary/20" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  {currentLesson?.title || 'Loading lesson...'}
                </h2>
                <p className="text-xs text-secondary font-bold uppercase tracking-[0.2em]">
                  {course?.title}
                </p>
              </div>
            </>
          )}

          {!currentVideoUrl && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-1.5 w-full bg-white/20 rounded-full mb-6 overflow-hidden">
                <div className="h-full w-[45%] bg-secondary rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <PlayCircle className="h-6 w-6 text-white cursor-pointer" />
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-white cursor-pointer" />
                    <div className="h-1 w-16 bg-white/20 rounded-full">
                      <div className="h-full w-[80%] bg-white rounded-full" />
                    </div>
                  </div>
                  <span className="text-xs text-white font-medium">{currentLesson?.duration || '0:00'}</span>
                </div>
                <div className="flex items-center gap-6">
                  <Settings className="h-5 w-5 text-white cursor-pointer hover:rotate-45 transition-transform" />
                  <Maximize2 className="h-5 w-5 text-white cursor-pointer" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-8 lg:p-12 overflow-y-auto max-h-[calc(100vh-56.25vw)] lg:max-h-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/5 pb-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-secondary mb-3">
                <ShieldCheck className="h-5 w-5" />
                <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Member Education</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4 leading-tight">
                {currentLesson?.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-gray-500 text-xs font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-secondary/60" /> {currentLesson?.duration || '0:00'}</span>
                <button 
                  onClick={handleCompleteLesson}
                  disabled={savingProgress || !!readQuiz(currentLesson?.content || '')}
                  className={`flex items-center gap-2 transition-colors ${
                    currentLesson?.id && progress.includes(currentLesson.id) 
                      ? 'text-secondary font-bold' 
                      : 'text-gray-500 hover:text-secondary'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  {currentLesson?.id && progress.includes(currentLesson.id) ? 'Completed' : 'Mark as Complete'}
                </button>
                <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <Share2 className="h-4 w-4" /> Share
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => moveLesson(-1)} disabled={position <= 0}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 text-secondary" /> Previous
              </button>
              <button onClick={() => moveLesson(1)} disabled={position >= positions.length - 1} className="btn-glow disabled:opacity-30 flex items-center gap-2 px-8 py-3 bg-secondary text-primary font-bold rounded-xl text-sm transition-all">
                Next Lesson <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="prose prose-invert max-w-4xl">
            <h2 className="text-xl font-bold tracking-tight text-white mb-6">Lesson Content</h2>
            <div className="mb-8">
              {progressError && <p role="alert" className="text-red-400">{progressError}</p>}
              {renderMarkdown(memberLessonContent)}
              {quiz && <LessonQuiz key={currentLesson?.id} quiz={quiz} onPass={handleCompleteLesson} />}
            </div>
            

          </div>
        </div>
      </div>

      {/* Sidebar Area */}
      <div className="lg:w-[25%] bg-[#1A1F26] border-l border-white/5 flex flex-col h-screen sticky top-0 overflow-hidden shadow-2xl">
        {/* Tabs Header */}
        <div className="flex border-b border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-6 flex flex-col items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'text-secondary border-b-2 border-secondary bg-secondary/5' 
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-grow overflow-y-auto p-6 scrollbar-hide">
          {activeTab === 'lessons' && (
            <div className="space-y-8">
              {modules.map((module, mIdx) => (
                <div key={module.id}>
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-4 pl-2">
                    {module.title}
                  </h3>
                  <div className="space-y-2">
                    {module.lessons?.map((lesson, lIdx) => (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setCurrentModuleIdx(mIdx);
                          setCurrentLessonIdx(lIdx);
                        }}
                        className={`w-full text-left px-5 py-4 rounded-2xl text-sm transition-all flex items-center justify-between group ${
                          currentModuleIdx === mIdx && currentLessonIdx === lIdx
                            ? 'bg-secondary/10 text-secondary border border-secondary/20 font-medium' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className="truncate">{lesson.title}</span>
                        {progress.includes(lesson.id) ? (
                          <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                        ) : (
                          <PlayCircle className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 italic mb-4">Supporting documents for this course:</p>
              <div className="p-5 rounded-2xl bg-secondary/5 border border-secondary/10 mb-6 flex items-center justify-between group cursor-pointer hover:bg-secondary/10 transition-all" onClick={() => window.location.href = "/resources"}>
                <div className="flex items-center gap-4">
                  <BookOpen className="h-5 w-5 text-secondary" />
                  <p className="text-sm font-medium text-white">Knowledge Base</p>
                </div>
                <ExternalLink className="h-4 w-4 text-secondary/60 group-hover:text-secondary" />
              </div>
              <p className="text-gray-400">No course-specific files are attached.</p>
            </div>
          )}

          {activeTab === 'quiz' && <p className="text-gray-300">{quiz ? 'Complete the knowledge check below this lesson. Passing records lesson completion.' : 'This lesson has no interactive quiz. Continue through the course lessons.'}</p>}
          
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <textarea 
                className="w-full h-64 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-gray-300 focus:outline-none focus:border-secondary/30 transition-all placeholder:text-gray-600 italic"
                placeholder="Type your notes here... (Auto-saved locally)"
              ></textarea>
              <button className="w-full py-4 bg-secondary/10 text-secondary font-bold text-xs uppercase tracking-widest rounded-2xl border border-secondary/20 hover:bg-secondary/20 transition-all">
                Export Notes to PDF
              </button>
            </div>
          )}
        </div>
        
        {/* Progress Summary Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Course Progress</span>
            <span className="text-xs font-bold text-secondary">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary transition-all duration-1000" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
