import { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Zap,
  Loader,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit3,
  Eye,
  HelpCircle,
  PlayCircle,
  Upload,
  Search,
  Clapperboard
} from 'lucide-react';
import { VideoLessonBuilder } from '../../components/admin/video-lesson-builder/VideoLessonBuilder';
import { authenticatedJsonFetch } from '../../lib/apiClient';
import { REVIVE_VIDEO_BRAND_PROMPT, generateCourse, generateLessonVideoScript, generateVideoPackage, type AIGeneratedCourse, type AIGenerationStatus, type AILessonVideoScript } from '../../lib/aiCourseBuilder';
import {
  adminGetStats,
  adminGetAllCourses,
  adminGetCourseLessonOptions,
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  adminAddModule,
  adminUpdateModule,
  adminAddLesson,
  adminUpdateLesson,
  adminCreateVideoPackage,
  adminGetLatestVideoPackages,
  adminCreateTemplate,
  adminDeleteTemplate,
  adminGetAllTemplates,
  adminGetMembers,
  adminSaveQuiz,
  adminSaveFullCourse,
  adminSaveVideoLessonMetadata,
  type AdminStats,
  type MemberWithProgress,
} from '../../lib/adminService';
import { getCourseWithContent } from '../../lib/supabase';
import type { Course, Lesson, Module, Template, VideoPackage, VideoPackageData } from '../../lib/supabase';
import type { CourseLessonOption } from '../../lib/video-lessons/videoLessonTypes';
import { normalizeCourseLevel } from '../../lib/courseLevel';

type ModuleDraft = {
  title: string;
  description: string;
  order: number;
};

type LessonDraft = {
  title: string;
  content: string;
  video_url: string;
  duration: string;
  order: number;
};

type HeyGenLessonStatus = {
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  videoId?: string;
  error?: string;
};

type ApiErrorDetail = {
  statusCode?: number;
  error: string;
  details?: string;
  body?: unknown;
};

const emptyLessonDraft = (order: number): LessonDraft => ({
  title: '',
  content: '',
  video_url: '',
  duration: '15 min',
  order,
});

const AI_DRAFT_STORAGE_KEY = 'revive-ai-course-builder-draft';

function formatLessonVideoPackage(video: AILessonVideoScript): string {
  const storyboard = video.storyboard?.map((scene, index) => (
    `### ${scene.scene || `Scene ${index + 1}`}\n` +
    `- Narration: ${scene.narration}\n` +
    `- On-screen text: ${scene.onScreenText}\n` +
    `- Suggested visuals: ${scene.suggestedVisuals}`
  )).join('\n\n') || '';

  const onScreenText = video.onScreenText?.length
    ? `\n\n### On-Screen Text\n${video.onScreenText.map(item => `- ${item}`).join('\n')}`
    : '';

  const suggestedVisuals = video.suggestedVisuals?.length
    ? `\n\n### Suggested Visuals\n${video.suggestedVisuals.map(item => `- ${item}`).join('\n')}`
    : '';

  return [
    '## Video Script',
    video.narrationScript,
    '## Storyboard',
    `${storyboard}${onScreenText}${suggestedVisuals}`,
    '## Video Generation Prompt',
    video.videoPrompt,
  ].join('\n\n');
}

function getGeneratedVideoPackage(content: string | null | undefined): string | null {
  if (!content) return null;
  const marker = '## Video Script';
  const markerIndex = content.lastIndexOf(marker);
  return markerIndex >= 0 ? content.slice(markerIndex).trim() : null;
}

function getMarkdownSection(content: string, heading: string): string {
  const sectionPattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  return sectionPattern.exec(content)?.[1]?.trim() || '';
}

function buildVideoCopyText(content: string, target: 'canva' | 'heygen'): string {
  const videoPackage = getGeneratedVideoPackage(content) || content;
  const narration = getMarkdownSection(videoPackage, 'Video Script');
  const storyboard = getMarkdownSection(videoPackage, 'Storyboard');
  const videoPrompt = getMarkdownSection(videoPackage, 'Video Generation Prompt');

  if (target === 'heygen') {
    return [
      'HEYGEN SCRIPT PACKAGE',
      '',
      'Narration Script:',
      narration,
      '',
      'Scene-by-Scene Storyboard, On-Screen Text, and Suggested Visuals:',
      storyboard,
      '',
      'Brand Style Prompt:',
      REVIVE_VIDEO_BRAND_PROMPT,
      '',
      'Video Generation Prompt:',
      videoPrompt,
    ].join('\n');
  }

  return [
    'CANVA VIDEO PROMPT PACKAGE',
    '',
    'Brand Style Prompt:',
    REVIVE_VIDEO_BRAND_PROMPT,
    '',
    'Canva/Pika/Video Prompt:',
    videoPrompt,
    '',
    'Narration Script:',
    narration,
    '',
    'Scene-by-Scene Storyboard, On-Screen Text, and Suggested Visuals:',
    storyboard,
  ].join('\n');
}

function buildEntireCanvaPrompt(videoPackage: VideoPackageData): string {
  return [
    'REVIVE DENTAL ACADEMY CANVA VIDEO PACKAGE',
    '',
    'Brand Style:',
    videoPackage.brandStyle,
    '',
    'Thumbnail Prompt:',
    videoPackage.thumbnailPrompt,
    '',
    'Scenes:',
    ...videoPackage.scenes.map((scene, index) => [
      `Scene ${index + 1}: ${scene.title}`,
      `Duration: ${scene.duration}`,
      `On-screen text: ${scene.onScreenText}`,
      `Visual description: ${scene.visualDescription}`,
      `Stock keywords: ${scene.stockKeywords.join(', ')}`,
      `Canva prompt: ${scene.canvaPrompt}`,
    ].join('\n')),
  ].join('\n\n');
}

function buildNarrationCopy(videoPackage: VideoPackageData): string {
  return videoPackage.scenes.map((scene, index) => (
    `Scene ${index + 1}: ${scene.title}\n${scene.narration}`
  )).join('\n\n');
}

function buildStoryboardForHeyGen(videoPackage: VideoPackageData): string {
  return videoPackage.scenes.map((scene, index) => (
    `Scene ${index + 1}: ${scene.title}\n` +
    `Duration: ${scene.duration}\n` +
    `Visuals: ${scene.visualDescription}\n` +
    `On-screen text: ${scene.onScreenText}`
  )).join('\n\n');
}

function toReadableString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function readApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text);
    if (response.url.includes('/api/video/')) {
      console.log('[AdminDashboard] Video API response body:', {
        ok: response.ok,
        status: response.status,
        body: parsed,
      });
    }
    return parsed;
  } catch {
    if (response.url.includes('/api/video/')) {
      console.log('[AdminDashboard] Video API non-JSON response body:', {
        ok: response.ok,
        status: response.status,
        body: text,
      });
    }
    return { error: text };
  }
}

function createApiError(response: Response, body: any, fallback: string): ApiErrorDetail {
  const errorMessage = body?.error
    ? toReadableString(body.error)
    : body?.message
      ? toReadableString(body.message)
      : fallback;
  const details = body?.details ? toReadableString(body.details) : undefined;

  return {
    statusCode: Number(body?.status || body?.statusCode || response.status),
    error: errorMessage,
    details,
    body,
  };
}

function formatApiError(error: ApiErrorDetail): string {
  const statusText = error.statusCode ? `Status ${error.statusCode}: ` : '';
  const message = toReadableString(error.error, 'Failed to generate HeyGen video.');
  const details = error.details ? ` - ${toReadableString(error.details)}` : '';
  return `${statusText}${message}${details}`;
}

function buildStoryboardCopy(videoPackage: VideoPackageData): string {
  return [
    `Thumbnail Prompt:\n${videoPackage.thumbnailPrompt}`,
    `Brand Style:\n${videoPackage.brandStyle}`,
    ...videoPackage.scenes.map((scene, index) => [
      `Scene ${index + 1}: ${scene.title}`,
      `Duration: ${scene.duration}`,
      `Narration: ${scene.narration}`,
      `Visuals: ${scene.visualDescription}`,
      `Stock Keywords: ${scene.stockKeywords.join(', ')}`,
      `On-Screen Text: ${scene.onScreenText}`,
      `Canva Prompt: ${scene.canvaPrompt}`,
    ].join('\n')),
  ].join('\n\n');
}

function getSavedAIDraft() {
  if (typeof window === 'undefined') {
    return { prompt: '', audience: 'Office Managers', objectives: '' };
  }

  try {
    const savedDraft = window.localStorage.getItem(AI_DRAFT_STORAGE_KEY);
    if (!savedDraft) return { prompt: '', audience: 'Office Managers', objectives: '' };
    const parsed = JSON.parse(savedDraft);
    return {
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
      audience: typeof parsed.audience === 'string' ? parsed.audience : 'Office Managers',
      objectives: typeof parsed.objectives === 'string' ? parsed.objectives : '',
    };
  } catch {
    return { prompt: '', audience: 'Office Managers', objectives: '' };
  }
}

const AdminDashboard = () => {
  const savedAIDraft = getSavedAIDraft();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview data
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Courses data
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', level: 'beginner', price: 0, duration: '', published: false });
  const [savingCourse, setSavingCourse] = useState(false);
  const [contentCourse, setContentCourse] = useState<Course | null>(null);
  const [contentModules, setContentModules] = useState<Module[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [generatingVideoLessonId, setGeneratingVideoLessonId] = useState<string | null>(null);
  const [generatingVideoPackageLessonId, setGeneratingVideoPackageLessonId] = useState<string | null>(null);
  const [generatingCourseMedia, setGeneratingCourseMedia] = useState(false);
  const [courseMediaProgress, setCourseMediaProgress] = useState('');
  const [videoPackages, setVideoPackages] = useState<Record<string, VideoPackage>>({});
  const [heyGenStatuses, setHeyGenStatuses] = useState<Record<string, HeyGenLessonStatus>>({});
  const [copiedVideoAction, setCopiedVideoAction] = useState<string | null>(null);
  const [newModule, setNewModule] = useState<ModuleDraft>({ title: '', description: '', order: 1 });
  const [newLessons, setNewLessons] = useState<Record<string, LessonDraft>>({});

  // Templates data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', description: '', category: 'verification', file_url: '', is_premium: false });

  // Members data
  const [members, setMembers] = useState<MemberWithProgress[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // AI Builder state
  const [aiPrompt, setAiPrompt] = useState(savedAIDraft.prompt);
  const [courseTopic, setCourseTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState(savedAIDraft.audience);
  const [learningObjectives, setLearningObjectives] = useState(savedAIDraft.objectives);
  const [aiStatus, setAiStatus] = useState<AIGenerationStatus>({ phase: 'idle' });
  const [aiPreviewCourse, setAiPreviewCourse] = useState<AIGeneratedCourse | null>(null);
  const [courseLessonOptions, setCourseLessonOptions] = useState<CourseLessonOption[]>([]);

  // Quiz builder state
  const [quizLessonId, setQuizLessonId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // ============================================================
  // Data Loading
  // ============================================================

  const loadData = useCallback(async (tab: string) => {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'overview': {
          const s = await adminGetStats();
          setStats(s);
          break;
        }
        case 'courses': {
          const c = await adminGetAllCourses();
          setCourses(c);
          break;
        }
        case 'templates': {
          const t = await adminGetAllTemplates();
          setTemplates(t);
          break;
        }
        case 'members': {
          const m = await adminGetMembers();
          setMembers(m);
          break;
        }
        case 'video-lesson-builder': {
          const options = await adminGetCourseLessonOptions();
          setCourseLessonOptions(options);
          break;
        }
      }
    } catch (err: any) {
      console.error(`Failed to load ${tab}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  useEffect(() => {
    window.localStorage.setItem(
      AI_DRAFT_STORAGE_KEY,
      JSON.stringify({
        prompt: aiPrompt,
        audience: targetAudience,
        objectives: learningObjectives,
      })
    );
  }, [aiPrompt, targetAudience, learningObjectives]);

  // ============================================================
  // Actions
  // ============================================================

  async function handleCreateCourse() {
    if (!newCourse.title.trim()) return;
    setSavingCourse(true);
    try {
      const course = editingCourseId
        ? await adminUpdateCourse(editingCourseId, newCourse)
        : await adminCreateCourse(newCourse);
      setCourses(prev => editingCourseId
        ? prev.map(c => c.id === course.id ? course : c)
        : [course, ...prev]
      );
      setShowCourseForm(false);
      setEditingCourseId(null);
      setNewCourse({ title: '', description: '', level: 'beginner', price: 0, duration: '', published: false });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCourse(false);
    }
  }

  function handleEditCourse(course: Course) {
    setEditingCourseId(course.id);
    setNewCourse({
      title: course.title,
      description: course.description || '',
      level: course.level,
      price: course.price,
      duration: course.duration || '',
      published: course.published,
    });
    setShowCourseForm(true);
  }

  function handleCancelCourseForm() {
    setShowCourseForm(false);
    setEditingCourseId(null);
    setNewCourse({ title: '', description: '', level: 'beginner', price: 0, duration: '', published: false });
  }

  async function handleManageContent(course: Course) {
    setContentCourse(course);
    setLoadingContent(true);
    setError(null);
    try {
      const { modules } = await getCourseWithContent(course.id);
      setContentModules(modules);
      setNewModule({ title: '', description: '', order: modules.length + 1 });
      setNewLessons(
        Object.fromEntries(
          modules.map(module => [module.id, emptyLessonDraft((module.lessons?.length || 0) + 1)])
        )
      );
      const lessonIds = modules.flatMap(module => module.lessons?.map(lesson => lesson.id) || []);
      try {
        const latestPackages = await adminGetLatestVideoPackages(lessonIds);
        setVideoPackages(latestPackages);
      } catch (packageErr: any) {
        console.warn('Video packages could not load:', packageErr);
        setVideoPackages({});
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingContent(false);
    }
  }

  async function handleAddModule() {
    if (!contentCourse || !newModule.title.trim()) return;
    setSavingContent(true);
    try {
      const module = await adminAddModule(contentCourse.id, newModule.title, newModule.order, newModule.description);
      setContentModules(prev => [...prev, { ...module, lessons: [] }].sort((a, b) => a.order - b.order));
      setNewModule({ title: '', description: '', order: contentModules.length + 2 });
      setNewLessons(prev => ({ ...prev, [module.id]: emptyLessonDraft(1) }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingContent(false);
    }
  }

  async function handleUpdateModule(module: Module) {
    if (!module.title.trim()) return;
    setSavingContent(true);
    try {
      const updatedModule = await adminUpdateModule(module.id, {
        title: module.title,
        description: module.description || '',
        order: module.order,
      });
      setContentModules(prev => prev
        .map(m => m.id === module.id ? { ...m, ...updatedModule, lessons: m.lessons } : m)
        .sort((a, b) => a.order - b.order)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingContent(false);
    }
  }

  function handleModuleDraftChange(moduleId: string, field: keyof ModuleDraft, value: string | number) {
    setContentModules(prev => prev.map(module => (
      module.id === moduleId ? { ...module, [field]: value } : module
    )));
  }

  function handleLessonDraftChange(moduleId: string, lessonId: string, field: keyof LessonDraft, value: string | number) {
    setContentModules(prev => prev.map(module => (
      module.id === moduleId
        ? {
            ...module,
            lessons: module.lessons?.map(lesson => (
              lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
            )),
          }
        : module
    )));
  }

  function handleNewLessonChange(moduleId: string, field: keyof LessonDraft, value: string | number) {
    setNewLessons(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || emptyLessonDraft(1)),
        [field]: value,
      },
    }));
  }

  async function handleAddLesson(moduleId: string) {
    const draft = newLessons[moduleId] || emptyLessonDraft(1);
    if (!draft.title.trim()) return;
    setSavingContent(true);
    try {
      const lesson = await adminAddLesson(moduleId, draft);
      setContentModules(prev => prev.map(module => (
        module.id === moduleId
          ? { ...module, lessons: [...(module.lessons || []), lesson].sort((a, b) => a.order - b.order) }
          : module
      )));
      const lessonCount = contentModules.find(module => module.id === moduleId)?.lessons?.length || 0;
      setNewLessons(prev => ({ ...prev, [moduleId]: emptyLessonDraft(lessonCount + 2) }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingContent(false);
    }
  }

  async function handleUpdateLesson(moduleId: string, lesson: Lesson) {
    if (!lesson.title.trim()) return;
    setSavingContent(true);
    try {
      const updatedLesson = await adminUpdateLesson(lesson.id, {
        title: lesson.title,
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        duration: lesson.duration || '',
        order: lesson.order,
      });
      setContentModules(prev => prev.map(module => (
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons
                ?.map(item => item.id === lesson.id ? updatedLesson : item)
                .sort((a, b) => a.order - b.order),
            }
          : module
      )));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingContent(false);
    }
  }

  async function handleGenerateVideoScript(module: Module, lesson: Lesson) {
    if (!contentCourse || !lesson.title.trim()) return;
    setGeneratingVideoLessonId(lesson.id);
    setError(null);

    try {
      const result = await generateLessonVideoScript({
        courseTitle: contentCourse.title,
        moduleTitle: module.title,
        lessonTitle: lesson.title,
        lessonContent: lesson.content || '',
      });

      if (!result.success || !result.video) {
        throw new Error(toReadableString(result.error, 'Failed to generate video script.'));
      }

      const baseContent = (lesson.content || '').trim();
      const generatedContent = formatLessonVideoPackage(result.video);
      const updatedContent = baseContent
        ? `${baseContent}\n\n---\n\n${generatedContent}`
        : generatedContent;

      const updatedLesson = await adminUpdateLesson(lesson.id, {
        title: lesson.title,
        content: updatedContent,
        video_url: lesson.video_url || '',
        duration: lesson.duration || '',
        order: lesson.order,
      });

      setContentModules(prev => prev.map(item => (
        item.id === module.id
          ? {
              ...item,
              lessons: item.lessons?.map(existingLesson => (
                existingLesson.id === lesson.id ? updatedLesson : existingLesson
              )),
            }
          : item
      )));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingVideoLessonId(null);
    }
  }

  async function handleCopyVideoContent(lesson: Lesson, target: 'canva' | 'heygen') {
    const content = lesson.content || '';
    if (!getGeneratedVideoPackage(content)) return;

    try {
      await navigator.clipboard.writeText(buildVideoCopyText(content, target));
      const actionKey = `${target}-${lesson.id}`;
      setCopiedVideoAction(actionKey);
      window.setTimeout(() => setCopiedVideoAction(current => current === actionKey ? null : current), 2000);
    } catch {
      setError('Unable to copy to clipboard. Please select and copy the generated lesson content manually.');
    }
  }

  async function generateAndStoreVideoPackage(lesson: Lesson): Promise<VideoPackage> {
    if (!contentCourse) throw new Error('Select a course before generating media packages.');

    const result = await generateVideoPackage({
      courseTitle: contentCourse.title,
      lessonTitle: lesson.title,
      lessonContent: lesson.content || '',
    });

    if (!result.success || !result.package) {
      throw new Error(toReadableString(result.error, 'Failed to generate video package.'));
    }

    const savedPackage = await adminCreateVideoPackage(lesson.id, result.package);
    setVideoPackages(prev => ({ ...prev, [lesson.id]: savedPackage }));
    return savedPackage;
  }

  async function handleGenerateVideoPackage(lesson: Lesson) {
    if (!lesson.title.trim()) return;
    setGeneratingVideoPackageLessonId(lesson.id);
    setError(null);

    try {
      await generateAndStoreVideoPackage(lesson);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingVideoPackageLessonId(null);
    }
  }

  async function handleGenerateEntireCourseMedia() {
    const lessons = contentModules.flatMap(module => module.lessons || []);
    if (lessons.length === 0) return;

    setGeneratingCourseMedia(true);
    setError(null);

    try {
      for (let index = 0; index < lessons.length; index += 1) {
        const lesson = lessons[index];
        setCourseMediaProgress(`${index + 1}/${lessons.length}: ${lesson.title}`);
        setGeneratingVideoPackageLessonId(lesson.id);
        await generateAndStoreVideoPackage(lesson);
      }
      setCourseMediaProgress(`Generated ${lessons.length} video packages.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingCourseMedia(false);
      setGeneratingVideoPackageLessonId(null);
    }
  }

  async function handleCopyVideoPackage(lesson: Lesson, target: 'canva' | 'narration' | 'storyboard') {
    const savedPackage = videoPackages[lesson.id]?.package;
    if (!savedPackage) return;

    const copyText = target === 'canva'
      ? buildEntireCanvaPrompt(savedPackage)
      : target === 'narration'
        ? buildNarrationCopy(savedPackage)
        : buildStoryboardCopy(savedPackage);

    try {
      await navigator.clipboard.writeText(copyText);
      const actionKey = `${target}-package-${lesson.id}`;
      setCopiedVideoAction(actionKey);
      window.setTimeout(() => setCopiedVideoAction(current => current === actionKey ? null : current), 2000);
    } catch {
      setError('Unable to copy to clipboard. Please select and copy the package text manually.');
    }
  }

  async function pollHeyGenVideo(moduleId: string, lesson: Lesson, videoId: string) {
    const maxAttempts = 40;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 10000));

      const response = await authenticatedJsonFetch(`/api/video/heygen-status/${videoId}`);
      const result = await readApiResponse(response);

      if (!response.ok) {
        const apiError = createApiError(response, result, 'Failed to check HeyGen video status.');
        console.error('HeyGen status request failed:', apiError);
        throw apiError;
      }

      if (result.status === 'completed' && result.videoUrl) {
        const updatedLesson = await adminUpdateLesson(lesson.id, {
          title: lesson.title,
          content: lesson.content || '',
          video_url: result.videoUrl,
          duration: lesson.duration || '',
          order: lesson.order,
        });

        setContentModules(prev => prev.map(module => (
          module.id === moduleId
            ? {
                ...module,
                lessons: module.lessons?.map(existingLesson => (
                  existingLesson.id === lesson.id ? updatedLesson : existingLesson
                )),
              }
            : module
        )));
        setHeyGenStatuses(prev => ({ ...prev, [lesson.id]: { status: 'completed', videoId } }));
        return;
      }

      if (result.status === 'failed') {
        const apiError: ApiErrorDetail = {
          error: result.error ? toReadableString(result.error) : 'HeyGen video generation failed.',
          details: result.details ? toReadableString(result.details) : undefined,
          body: result,
        };
        console.error('HeyGen rendering failed:', apiError);
        throw apiError;
      }

      setHeyGenStatuses(prev => ({ ...prev, [lesson.id]: { status: 'rendering', videoId } }));
    }

    throw { error: 'HeyGen video generation timed out before completion.' } satisfies ApiErrorDetail;
  }

  async function handleGenerateHeyGenVideo(moduleId: string, lesson: Lesson) {
    const videoPackage = videoPackages[lesson.id]?.package;
    if (!videoPackage) return;

    setError(null);
    setHeyGenStatuses(prev => ({ ...prev, [lesson.id]: { status: 'queued' } }));

    try {
      const response = await authenticatedJsonFetch('/api/video/generate-heygen-video', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id,
          title: lesson.title,
          narration: buildNarrationCopy(videoPackage),
          storyboard: buildStoryboardForHeyGen(videoPackage),
          brandStyle: videoPackage.brandStyle,
        }),
      });
      const result = await readApiResponse(response);
      console.log('[AdminDashboard] Generate HeyGen Video response:', {
        ok: response.ok,
        status: response.status,
        body: result,
      });

      if (!response.ok) {
        const apiError = createApiError(response, result, 'Failed to queue HeyGen video.');
        console.error('HeyGen queue request failed:', apiError);
        throw apiError;
      }

      setHeyGenStatuses(prev => ({ ...prev, [lesson.id]: { status: 'rendering', videoId: result.videoId } }));
      await pollHeyGenVideo(moduleId, lesson, result.videoId);
    } catch (err: any) {
      console.log('[AdminDashboard] Generate HeyGen Video error response:', err);
      console.error('Generate HeyGen Video failed:', err);
      const apiError: ApiErrorDetail = {
        statusCode: Number(err.statusCode || err.status || 0) || undefined,
        error: err.error ? toReadableString(err.error) : toReadableString(err.message, 'Failed to generate HeyGen video.'),
        details: err.details ? toReadableString(err.details) : undefined,
        body: err.body,
      };
      const displayMessage = formatApiError(apiError);
      setHeyGenStatuses(prev => ({ ...prev, [lesson.id]: { ...prev[lesson.id], status: 'failed', error: displayMessage } }));
      setError(displayMessage);
    }
  }

  async function handleDeleteCourse(courseId: string) {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      await adminDeleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplate.title.trim() || !newTemplate.file_url.trim()) return;
    try {
      const template = await adminCreateTemplate(newTemplate);
      setTemplates(prev => [template, ...prev]);
      setShowTemplateForm(false);
      setNewTemplate({ title: '', description: '', category: 'verification', file_url: '', is_premium: false });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await adminDeleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleAddQuestion() {
    setQuizQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);
  }

  function handleRemoveQuestion(index: number) {
    setQuizQuestions(prev => prev.filter((_, i) => i !== index));
  }

  function handleQuestionChange(index: number, field: string, value: any) {
    setQuizQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }

  function handleOptionChange(qIndex: number, oIndex: number, value: string) {
    setQuizQuestions(prev => prev.map((q, i) => 
      i === qIndex ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) } : q
    ));
  }

  async function handleSaveQuiz() {
    if (!quizLessonId || !quizTitle) return;
    setSavingQuiz(true);
    try {
      await adminSaveQuiz({
        lesson_id: quizLessonId,
        title: quizTitle,
        questions: quizQuestions.filter(q => q.question.trim()),
      });
      setQuizLessonId('');
      setQuizTitle('');
      setQuizQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingQuiz(false);
    }
  }

  // AI Builder

  async function handleGenerateCourse() {
    if (!aiPrompt.trim()) return;
    setAiStatus({ phase: 'generating', message: 'Connecting to AI engine...' });
    setAiPreviewCourse(null);
    
    const result = await generateCourse(
      {
        topic: courseTopic || aiPrompt.slice(0, 80),
        audience: targetAudience,
        objectives: learningObjectives,
        prompt: aiPrompt,
        preview: true,
      },
      (status) => setAiStatus(status)
    );

    if (result.success && result.course) {
      setAiPreviewCourse(result.course);
      setAiStatus({ phase: 'idle' });
    } else if (!result.success) {
      setAiStatus({ phase: 'error', error: toReadableString(result.error, 'Failed to generate course') });
    }
  }

  function handleClearAIDraft() {
    setAiPrompt('');
    setTargetAudience('Office Managers');
    setLearningObjectives('');
    setAiPreviewCourse(null);
    setAiStatus({ phase: 'idle' });
    window.localStorage.removeItem(AI_DRAFT_STORAGE_KEY);
  }

  async function handleSaveAICourse() {
    if (!aiPreviewCourse) return;
    setAiStatus({ phase: 'saving' });
    try {
      const courseId = await adminSaveFullCourse(aiPreviewCourse);
      setAiStatus({ phase: 'done', courseId });
      // Refresh course list
      const c = await adminGetAllCourses();
      setCourses(c);
      setTimeout(() => {
        setAiPreviewCourse(null);
        setAiPrompt('');
        setCourseTopic('');
        setLearningObjectives('');
        setActiveTab('courses');
      }, 2000);
    } catch (err: any) {
      setAiStatus({ phase: 'error', error: err.message });
    }
  }
  // ============================================================
  // Render: Sidebar
  // ============================================================

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'courses', label: 'Manage Courses', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'templates', label: 'Manage Templates', icon: <FileText className="h-4 w-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
    { id: 'ai-builder', label: 'AI Course Builder', icon: <Zap className="h-4 w-4" />, highlight: true },
    { id: 'video-lesson-builder', label: 'Video Lesson Builder', icon: <Clapperboard className="h-4 w-4" />, highlight: true },
    { id: 'quizzes', label: 'Quiz Builder', icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const renderSidebar = () => (
    <div className="w-64 bg-charcoal-dark border-r border-white/5 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <span className="text-white font-bold text-lg tracking-tight leading-none">ADMIN</span>
        <span className="text-brand-mint text-[10px] uppercase tracking-[0.2em] font-medium block mt-1">Academy Control</span>
      </div>
      <nav className="flex-grow p-4 space-y-2">
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.id 
                ? 'bg-brand-mint/10 text-brand-mint' 
                : item.highlight ? 'text-brand-teal hover:bg-brand-teal/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  // ============================================================
  // Loading / Error States
  // ============================================================

  if (loading && activeTab !== 'ai-builder') {
    return (
      <div className="bg-charcoal min-h-screen flex">
        {renderSidebar()}
        <div className="flex-grow flex items-center justify-center">
          <Loader className="h-8 w-8 text-brand-mint animate-spin" />
        </div>
      </div>
    );
  }

  const renderAIBuilder = () => {
    const aiPreview = aiPreviewCourse;
    const aiError = aiStatus.phase === 'error' ? aiStatus.error : null;
    const scripts = aiPreview?.modules?.flatMap(module =>
      module.lessons
        ?.filter(lesson => lesson.script)
        .map(lesson => ({ lessonTitle: lesson.title, script: lesson.script || '' })) || []
    ) || [];

    return (
      <div className="max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 text-brand-mint mb-3">
            <Zap className="h-5 w-5" />
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold">AI Course Builder</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Build a Course Draft</h1>
          <p className="text-gray-400">Generate a complete draft, review every section, then save it as a new unpublished course.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-8">
          <div className="bg-charcoal-light border border-white/5 rounded-xl p-6 h-fit space-y-5">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Course Prompt</label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={12}
                placeholder="Example: Create a practical dental insurance course for front desk teams on verifying benefits, identifying missing frequency limits, documenting calls, and preventing claim denials. Include scripts, quizzes, checklists, and realistic office examples."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-white text-sm leading-relaxed focus:border-brand-mint/50 focus:outline-none placeholder:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Target Audience</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-mint/50 focus:outline-none"
              >
                <option>Office Managers</option>
                <option>Billing Coordinators</option>
                <option>New Front Desk Hires</option>
                <option>Treatment Coordinators</option>
                <option>Dental Assistants</option>
                <option>Practice Owners</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Learning Objectives</label>
              <textarea
                value={learningObjectives}
                onChange={e => setLearningObjectives(e.target.value)}
                rows={4}
                placeholder="Optional goals, outcomes, or specific workflows to include."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-mint/50 focus:outline-none placeholder:text-gray-600"
              />
            </div>

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
                {aiError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGenerateCourse}
                disabled={!aiPrompt.trim() || aiStatus.phase === 'generating' || aiStatus.phase === 'saving'}
                className="flex-1 py-4 bg-brand-teal text-charcoal font-bold rounded-xl hover:bg-brand-teal/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-teal/10"
              >
                {aiStatus.phase === 'generating' ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Generating Course...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Generate Course</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClearAIDraft}
                disabled={aiStatus.phase === 'generating' || aiStatus.phase === 'saving'}
                className="px-5 py-4 rounded-xl border border-white/10 bg-white/5 text-gray-300 font-bold text-sm hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                Clear Draft
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {!aiPreview ? (
              <div className="bg-charcoal-light border border-white/5 rounded-xl p-12 text-center">
                <Zap className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-white font-bold mb-2">No draft generated yet</h2>
                <p className="text-gray-500 text-sm">Generated modules, lessons, quizzes, checklists, and scripts will appear here.</p>
              </div>
            ) : (
              <>
                <div className="bg-charcoal-light border border-brand-mint/20 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-mint bg-brand-mint/10 px-3 py-1 rounded-full">AI Draft</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{normalizeCourseLevel(aiPreview.level)} · {aiPreview.duration}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-3">{aiPreview.title}</h2>
                      <p className="text-gray-400 text-sm leading-relaxed">{aiPreview.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveAICourse}
                        disabled={aiStatus.phase === 'saving' || aiStatus.phase === 'done'}
                        className="flex items-center gap-2 bg-brand-teal text-charcoal font-bold py-3 px-5 rounded-xl hover:bg-brand-teal/90 transition-all disabled:opacity-50"
                      >
                        {aiStatus.phase === 'saving' ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        <span>{aiStatus.phase === 'done' ? 'Saved' : aiStatus.phase === 'saving' ? 'Saving...' : 'Save to Supabase'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setAiPreviewCourse(null);
                          setAiStatus({ phase: 'idle' });
                        }}
                        className="text-sm text-gray-500 hover:text-white font-bold"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </div>

                {aiPreview.checklist?.length ? (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiPreview.checklist.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 bg-white/5 rounded-lg p-3 text-sm text-gray-300">
                          <CheckCircle className="h-4 w-4 text-brand-mint mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {aiPreview.modules?.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                          <h3 className="text-white font-bold flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[11px] text-brand-mint font-mono">{module.order || moduleIndex + 1}</span>
                            {module.title}
                          </h3>
                          <p className="text-gray-500 text-sm mt-2">{module.description}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{module.lessons?.length || 0} Lessons</span>
                      </div>

                      <div className="space-y-3">
                        {module.lessons?.map((lesson, lessonIndex) => (
                          <div key={lessonIndex} className="bg-black/10 border border-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <PlayCircle className="h-4 w-4 text-brand-mint/70" />
                                {lesson.title}
                              </h4>
                              <span className="text-xs text-gray-500">{lesson.duration}</span>
                            </div>
                            <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-4">{lesson.content}</p>
                            {lesson.script && (
                              <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint mb-2">Script</p>
                                <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-4">{lesson.script}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {module.quiz?.questions?.length ? (
                        <div className="mt-5 border-t border-white/5 pt-5">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">{module.quiz.title || 'Quiz'}</h4>
                          <div className="space-y-3">
                            {module.quiz.questions.map((question, questionIndex) => (
                              <div key={questionIndex} className="bg-white/[0.02] rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-200 mb-3">{questionIndex + 1}. {question.question}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {question.options.map((option, optionIndex) => (
                                    <span
                                      key={optionIndex}
                                      className={`text-xs rounded px-3 py-2 ${question.correctIndex === optionIndex ? 'bg-brand-mint/10 text-brand-mint' : 'bg-white/5 text-gray-400'}`}
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {scripts.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Scripts</h3>
                    <div className="space-y-3">
                      {scripts.map((script, index) => (
                        <div key={index} className="bg-black/10 border border-white/5 rounded-lg p-4">
                          <p className="text-xs font-bold text-brand-mint mb-2">{script.lessonTitle}</p>
                          <p className="text-sm text-gray-400 whitespace-pre-wrap">{script.script}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // Render: Main Content
  // ============================================================

  const renderContent = () => {
    // Error banner
    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200 text-sm underline">Dismiss</button>
        </div>
      );
    }

    switch (activeTab) {
      // ==========================================================
      // OVERVIEW
      // ==========================================================
      case 'overview':
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
              <button
                onClick={() => setActiveTab('courses')}
                className="flex items-center space-x-2 bg-brand-teal text-charcoal font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal/90"
              >
                <Plus className="h-4 w-4" />
                <span>Create Course</span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Total Courses', value: stats?.totalCourses || 0, change: '+2' },
                { label: 'Active Members', value: stats?.activeSubscriptions || 0, change: '+5%' },
                { label: 'Total Members', value: stats?.totalMembers || 0, change: '+12%' },
                { label: 'Avg. Completion', value: `${stats?.avgCompletionRate || 0}%`, change: '+2%' },
              ].map((stat, i) => (
                <div key={i} className="bg-charcoal-light border border-white/5 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-white/5 text-brand-mint">
                      {[<LayoutDashboard />, <Users />, <BookOpen />, <FileText />][i]}
                    </div>
                    <span className="text-xs font-bold text-green-500">{stat.change}</span>
                  </div>
                  <div className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Courses Table */}
            <div className="bg-charcoal-light border border-white/5 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Courses ({courses.length})</h2>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="text-sm text-brand-mint font-bold hover:underline"
                >
                  Manage All
                </button>
              </div>
              {courses.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No courses yet. Create your first course!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                      <th className="px-6 py-4 font-bold">Title</th>
                      <th className="px-6 py-4 font-bold">Level</th>
                      <th className="px-6 py-4 font-bold">Price</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {courses.slice(0, 5).map(course => (
                      <tr key={course.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-white">{course.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 capitalize">{course.level}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">${course.price}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            course.published ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {course.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button className="text-gray-500 hover:text-white p-1"><Eye className="h-4 w-4" /></button>
                            <button
                              onClick={() => {
                                handleEditCourse(course);
                                setActiveTab('courses');
                              }}
                              className="text-gray-500 hover:text-white p-1"
                              title="Edit course"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteCourse(course.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        );

      // ==========================================================
      // COURSES
      // ==========================================================
      case 'courses':
        return (
          <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Manage Courses</h1>
              <button
                onClick={() => {
                  if (showCourseForm) {
                    handleCancelCourseForm();
                    return;
                  }
                  setShowCourseForm(true);
                }}
                className="flex items-center space-x-2 bg-brand-teal text-charcoal font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal/90"
              >
                <Plus className="h-4 w-4" />
                {!showCourseForm && (
                  <button 
                    onClick={() => setActiveTab('ai-builder')}
                    className="flex items-center space-x-2 bg-brand-mint/10 text-brand-mint font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-mint/20 border border-brand-mint/20"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Draft with AI</span>
                  </button>
                )}
                <span>{showCourseForm ? 'Cancel' : 'New Course'}</span>
              </button>
            </div>

            {/* Course Form */}
            {showCourseForm && (
              <div className="bg-charcoal-light border border-white/5 rounded-xl p-6 mb-8 space-y-4">
                <h3 className="text-white font-bold">{editingCourseId ? 'Edit Course' : 'Create New Course'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Title *</label>
                    <input value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-brand-mint/50 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-brand-mint/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Level</label>
                    <select value={newCourse.level} onChange={e => setNewCourse(p => ({ ...p, level: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm">
                      <option>beginner</option><option>intermediate</option><option>advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Price ($)</label>
                    <input type="number" value={newCourse.price} onChange={e => setNewCourse(p => ({ ...p, price: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Duration</label>
                    <input value={newCourse.duration} onChange={e => setNewCourse(p => ({ ...p, duration: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <label className="flex items-center space-x-3 text-sm text-gray-300 pt-6">
                    <input
                      type="checkbox"
                      checked={newCourse.published}
                      onChange={e => setNewCourse(p => ({ ...p, published: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-mint focus:ring-brand-mint/30"
                    />
                    <span>Published</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button onClick={handleCancelCourseForm} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={handleCreateCourse} disabled={savingCourse || !newCourse.title.trim()}
                    className="px-6 py-2 bg-brand-teal text-charcoal font-bold rounded-lg text-sm hover:bg-brand-teal/90 disabled:opacity-50">
                    {savingCourse ? 'Saving...' : editingCourseId ? 'Save Changes' : 'Create Course'}
                  </button>
                </div>
              </div>
            )}

            {contentCourse && (
              <div className="bg-charcoal-light border border-brand-mint/10 rounded-xl p-6 mb-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint mb-2">Course Content</p>
                    <h3 className="text-white font-bold text-lg">{contentCourse.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage modules and lessons saved to Supabase.</p>
                    {courseMediaProgress && (
                      <p className="text-xs text-brand-mint mt-2">{courseMediaProgress}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleGenerateEntireCourseMedia}
                      disabled={generatingCourseMedia || contentModules.every(module => !module.lessons?.length)}
                      className="px-4 py-2 rounded-lg bg-brand-teal text-charcoal font-bold text-sm hover:bg-brand-teal/90 disabled:opacity-50"
                    >
                      {generatingCourseMedia ? 'Generating Course Media...' : 'Generate Entire Course Media'}
                    </button>
                    <button
                      onClick={() => {
                        setContentCourse(null);
                        setContentModules([]);
                        setNewLessons({});
                        setVideoPackages({});
                        setCourseMediaProgress('');
                      }}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3 border border-white/5 rounded-xl p-4 bg-black/10">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">New Module Title</label>
                    <input
                      value={newModule.title}
                      onChange={e => setNewModule(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-brand-mint/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Order</label>
                    <input
                      type="number"
                      value={newModule.order}
                      onChange={e => setNewModule(p => ({ ...p, order: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea
                      value={newModule.description}
                      onChange={e => setNewModule(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      onClick={handleAddModule}
                      disabled={savingContent || !newModule.title.trim()}
                      className="px-5 py-2 bg-brand-teal text-charcoal font-bold rounded-lg text-sm hover:bg-brand-teal/90 disabled:opacity-50"
                    >
                      Add Module
                    </button>
                  </div>
                </div>

                {loadingContent ? (
                  <div className="py-10 flex justify-center">
                    <Loader className="h-6 w-6 text-brand-mint animate-spin" />
                  </div>
                ) : contentModules.length === 0 ? (
                  <div className="border border-white/5 rounded-xl p-8 text-center text-gray-500">
                    No modules yet. Add the first module above.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {contentModules.map(module => (
                      <div key={module.id} className="border border-white/5 rounded-xl p-5 bg-black/10 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Module Title</label>
                            <input
                              value={module.title}
                              onChange={e => handleModuleDraftChange(module.id, 'title', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-brand-mint/50 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Order</label>
                            <input
                              type="number"
                              value={module.order}
                              onChange={e => handleModuleDraftChange(module.id, 'order', Number(e.target.value))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                            />
                          </div>
                          <button
                            onClick={() => handleUpdateModule(module)}
                            disabled={savingContent || !module.title.trim()}
                            className="px-4 py-2 rounded-lg bg-brand-mint/10 text-brand-mint font-bold text-sm border border-brand-mint/20 hover:bg-brand-mint/20 disabled:opacity-50"
                          >
                            Save Module
                          </button>
                          <div className="md:col-span-3">
                            <label className="block text-xs text-gray-400 mb-1">Module Description</label>
                            <textarea
                              value={module.description || ''}
                              onChange={e => handleModuleDraftChange(module.id, 'description', e.target.value)}
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-t border-white/5 pt-5">
                            <h4 className="text-sm font-bold text-white">Lessons</h4>
                            <span className="text-xs text-gray-500">{module.lessons?.length || 0} saved</span>
                          </div>

                          {module.lessons?.map(lesson => (
                            <div key={lesson.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px] gap-3">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Lesson Title</label>
                                  <input
                                    value={lesson.title}
                                    onChange={e => handleLessonDraftChange(module.id, lesson.id, 'title', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Order</label>
                                  <input
                                    type="number"
                                    value={lesson.order}
                                    onChange={e => handleLessonDraftChange(module.id, lesson.id, 'order', Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Duration</label>
                                  <input
                                    value={lesson.duration || ''}
                                    onChange={e => handleLessonDraftChange(module.id, lesson.id, 'duration', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Final Video URL</label>
                                <input
                                  value={lesson.video_url || ''}
                                  placeholder="Paste the final Canva, HeyGen, Pika, Vimeo, or YouTube URL here"
                                  onChange={e => handleLessonDraftChange(module.id, lesson.id, 'video_url', e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Lesson Content</label>
                                <textarea
                                  value={lesson.content || ''}
                                  onChange={e => handleLessonDraftChange(module.id, lesson.id, 'content', e.target.value)}
                                  rows={5}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm font-mono"
                                />
                              </div>
                              {getGeneratedVideoPackage(lesson.content) && (
                                <div className="rounded-xl border border-brand-mint/10 bg-brand-mint/5 p-4">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-brand-mint mb-1">Generated Video Package</p>
                                      <p className="text-xs text-gray-500">Copy a clean package for Canva or HeyGen, then paste the final rendered video URL above.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <button
                                        onClick={() => handleCopyVideoContent(lesson, 'canva')}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-200 font-bold text-sm border border-white/10 hover:bg-white/10"
                                      >
                                        {copiedVideoAction === `canva-${lesson.id}` ? 'Copied Canva Prompt' : 'Copy Canva Video Prompt'}
                                      </button>
                                      <button
                                        onClick={() => handleCopyVideoContent(lesson, 'heygen')}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-gray-200 font-bold text-sm border border-white/10 hover:bg-white/10"
                                      >
                                        {copiedVideoAction === `heygen-${lesson.id}` ? 'Copied HeyGen Script' : 'Copy HeyGen Script'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {videoPackages[lesson.id] && (
                                <div className="rounded-xl border border-white/10 bg-black/10 p-4 space-y-4">
                                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-brand-mint mb-2">AI Video Factory Package</p>
                                      <p className="text-xs text-gray-500 mb-3">Latest package saved {new Date(videoPackages[lesson.id].created_at).toLocaleString()}</p>
                                      <p className="text-sm text-gray-300"><span className="font-bold text-white">Thumbnail:</span> {videoPackages[lesson.id].package.thumbnailPrompt}</p>
                                      <p className="text-sm text-gray-400 mt-2"><span className="font-bold text-white">Brand:</span> {videoPackages[lesson.id].package.brandStyle}</p>
                                      {heyGenStatuses[lesson.id] && (
                                        <p className={`text-xs font-bold uppercase tracking-widest mt-3 ${
                                          heyGenStatuses[lesson.id].status === 'completed'
                                            ? 'text-green-500'
                                            : heyGenStatuses[lesson.id].status === 'failed'
                                              ? 'text-red-400'
                                              : 'text-brand-mint'
                                        }`}>
                                          HeyGen: {heyGenStatuses[lesson.id].status}
                                          {heyGenStatuses[lesson.id].error ? ` - ${heyGenStatuses[lesson.id].error}` : ''}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <button
                                        onClick={() => handleGenerateHeyGenVideo(module.id, lesson)}
                                        disabled={['queued', 'rendering'].includes(heyGenStatuses[lesson.id]?.status || '')}
                                        className="px-3 py-2 rounded-lg bg-brand-teal/10 text-brand-teal font-bold text-xs border border-brand-teal/20 hover:bg-brand-teal/20 disabled:opacity-50"
                                      >
                                        {['queued', 'rendering'].includes(heyGenStatuses[lesson.id]?.status || '') ? 'HeyGen Rendering...' : 'Generate HeyGen Video'}
                                      </button>
                                      <button
                                        onClick={() => handleCopyVideoPackage(lesson, 'canva')}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-gray-200 font-bold text-xs border border-white/10 hover:bg-white/10"
                                      >
                                        {copiedVideoAction === `canva-package-${lesson.id}` ? 'Copied' : 'Copy Entire Canva Prompt'}
                                      </button>
                                      <button
                                        onClick={() => handleCopyVideoPackage(lesson, 'narration')}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-gray-200 font-bold text-xs border border-white/10 hover:bg-white/10"
                                      >
                                        {copiedVideoAction === `narration-package-${lesson.id}` ? 'Copied' : 'Copy Narration'}
                                      </button>
                                      <button
                                        onClick={() => handleCopyVideoPackage(lesson, 'storyboard')}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-gray-200 font-bold text-xs border border-white/10 hover:bg-white/10"
                                      >
                                        {copiedVideoAction === `storyboard-package-${lesson.id}` ? 'Copied' : 'Copy Storyboard'}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {videoPackages[lesson.id].package.scenes.map((scene, sceneIndex) => (
                                      <div key={sceneIndex} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                          <h5 className="text-white font-bold text-sm">{scene.title}</h5>
                                          <span className="text-[10px] text-brand-mint font-bold uppercase tracking-widest">{scene.duration}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-3"><span className="text-gray-300 font-bold">Narration:</span> {scene.narration}</p>
                                        <p className="text-xs text-gray-400 mb-3"><span className="text-gray-300 font-bold">Visuals:</span> {scene.visualDescription}</p>
                                        <p className="text-xs text-gray-400 mb-3"><span className="text-gray-300 font-bold">On-screen:</span> {scene.onScreenText}</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {scene.stockKeywords.map(keyword => (
                                            <span key={keyword} className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded">{keyword}</span>
                                          ))}
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">{scene.canvaPrompt}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                  onClick={() => handleGenerateVideoPackage(lesson)}
                                  disabled={savingContent || generatingCourseMedia || generatingVideoPackageLessonId === lesson.id || !lesson.title.trim()}
                                  className="px-4 py-2 rounded-lg bg-brand-teal/10 text-brand-teal font-bold text-sm border border-brand-teal/20 hover:bg-brand-teal/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {generatingVideoPackageLessonId === lesson.id ? <Loader className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                  <span>{generatingVideoPackageLessonId === lesson.id ? 'Generating Package...' : 'Generate Video Package'}</span>
                                </button>
                                <button
                                  onClick={() => handleGenerateVideoScript(module, lesson)}
                                  disabled={savingContent || generatingCourseMedia || generatingVideoLessonId === lesson.id || !lesson.title.trim()}
                                  className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 font-bold text-sm border border-white/10 hover:bg-brand-teal/10 hover:text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {generatingVideoLessonId === lesson.id ? <Loader className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                  <span>{generatingVideoLessonId === lesson.id ? 'Generating...' : 'Generate Video Script'}</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateLesson(module.id, lesson)}
                                  disabled={savingContent || generatingVideoLessonId === lesson.id || !lesson.title.trim()}
                                  className="px-4 py-2 rounded-lg bg-brand-mint/10 text-brand-mint font-bold text-sm border border-brand-mint/20 hover:bg-brand-mint/20 disabled:opacity-50"
                                >
                                  Save Lesson
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="rounded-xl border border-dashed border-white/10 p-4 space-y-3">
                            <h5 className="text-sm font-bold text-gray-300">Add Lesson</h5>
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px] gap-3">
                              <input
                                placeholder="Lesson title"
                                value={(newLessons[module.id] || emptyLessonDraft(1)).title}
                                onChange={e => handleNewLessonChange(module.id, 'title', e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm placeholder:text-gray-600"
                              />
                              <input
                                type="number"
                                placeholder="Order"
                                value={(newLessons[module.id] || emptyLessonDraft(1)).order}
                                onChange={e => handleNewLessonChange(module.id, 'order', Number(e.target.value))}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                              />
                              <input
                                placeholder="Duration"
                                value={(newLessons[module.id] || emptyLessonDraft(1)).duration}
                                onChange={e => handleNewLessonChange(module.id, 'duration', e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm placeholder:text-gray-600"
                              />
                            </div>
                            <input
                              placeholder="Video URL"
                              value={(newLessons[module.id] || emptyLessonDraft(1)).video_url}
                              onChange={e => handleNewLessonChange(module.id, 'video_url', e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm placeholder:text-gray-600"
                            />
                            <textarea
                              placeholder="Lesson content"
                              value={(newLessons[module.id] || emptyLessonDraft(1)).content}
                              onChange={e => handleNewLessonChange(module.id, 'content', e.target.value)}
                              rows={4}
                              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm font-mono placeholder:text-gray-600"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleAddLesson(module.id)}
                                disabled={savingContent || !(newLessons[module.id] || emptyLessonDraft(1)).title.trim()}
                                className="px-5 py-2 bg-brand-teal text-charcoal font-bold rounded-lg text-sm hover:bg-brand-teal/90 disabled:opacity-50"
                              >
                                Add Lesson
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Course List */}
            {courses.length === 0 ? (
              <div className="bg-white/5 border border-white/5 rounded-xl p-16 text-center">
                <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No courses yet. Click "New Course" to create one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map(course => (
                  <div key={course.id} className="bg-charcoal-light border border-white/5 rounded-xl p-5 flex items-center justify-between group hover:border-brand-mint/20 transition-all">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-white font-bold">{course.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          course.published ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>{course.published ? 'Published' : 'Draft'}</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">{course.description || 'No description'}</p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        <span className="capitalize">{course.level}</span>
                        <span>${course.price}</span>
                        <span>{course.duration || '—'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleManageContent(course)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-brand-teal/10"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm font-medium">Content</span>
                      </button>
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-brand-mint/10"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="text-sm font-medium">Edit</span>
                      </button>
                      <button onClick={() => handleDeleteCourse(course.id)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ==========================================================
      // TEMPLATES
      // ==========================================================
      case 'templates':
        return (
          <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Manage Templates</h1>
              <button
                onClick={() => setShowTemplateForm(!showTemplateForm)}
                className="flex items-center space-x-2 bg-brand-teal text-charcoal font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal/90"
              >
                <Upload className="h-4 w-4" />
                <span>{showTemplateForm ? 'Cancel' : 'Add Template'}</span>
              </button>
            </div>

            {/* New Template Form */}
            {showTemplateForm && (
              <div className="bg-charcoal-light border border-white/5 rounded-xl p-6 mb-8 space-y-4">
                <h3 className="text-white font-bold">Add New Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Title *</label>
                    <input value={newTemplate.title} onChange={e => setNewTemplate(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-brand-mint/50 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea value={newTemplate.description} onChange={e => setNewTemplate(p => ({ ...p, description: e.target.value }))} rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                    <select value={newTemplate.category} onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="verification">Verification</option>
                      <option value="scheduling">Scheduling</option>
                      <option value="billing">Billing</option>
                      <option value="forms">Forms</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Access</label>
                    <select value={newTemplate.is_premium ? 'premium' : 'free'} onChange={e => setNewTemplate(p => ({ ...p, is_premium: e.target.value === 'premium' }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="free">Free</option>
                      <option value="premium">Premium (Office Pro)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">File URL *</label>
                    <input value={newTemplate.file_url} onChange={e => setNewTemplate(p => ({ ...p, file_url: e.target.value }))}
                      placeholder="https://example.com/templates/my-template.pdf"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm w-full" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button onClick={() => setShowTemplateForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={handleCreateTemplate} disabled={!newTemplate.title.trim() || !newTemplate.file_url.trim()}
                    className="px-6 py-2 bg-brand-teal text-charcoal font-bold rounded-lg text-sm hover:bg-brand-teal/90 disabled:opacity-50">
                    Add Template
                  </button>
                </div>
              </div>
            )}

            {/* Template List */}
            {templates.length === 0 ? (
              <div className="bg-white/5 border border-white/5 rounded-xl p-16 text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No templates yet. Click "Add Template" to upload one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div key={template.id} className="bg-charcoal-light border border-white/5 rounded-xl p-5 hover:border-brand-mint/20 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-white/5 text-brand-mint">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex space-x-1">
                        {template.is_premium && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">PRO</span>
                        )}
                        <button onClick={() => handleDeleteTemplate(template.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">{template.title}</h3>
                    <p className="text-gray-500 text-xs line-clamp-1">{template.description || template.category}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{template.category}</span>
                      <a href={template.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-mint hover:underline">View File</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ==========================================================
      // MEMBERS
      // ==========================================================
      case 'members':
        const filteredMembers = members.filter(m =>
          m.profile.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.profile.id.includes(memberSearch)
        );

        return (
          <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Members ({members.length})</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-brand-mint/50 focus:outline-none w-64"
                />
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="bg-white/5 border border-white/5 rounded-xl p-16 text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">{members.length === 0 ? 'No members yet.' : 'No members match your search.'}</p>
              </div>
            ) : (
              <div className="bg-charcoal-light border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-widest bg-white/[0.02]">
                      <th className="px-6 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold">Role</th>
                      <th className="px-6 py-4 font-bold">Subscription</th>
                      <th className="px-6 py-4 font-bold">Courses</th>
                      <th className="px-6 py-4 font-bold">Progress</th>
                      <th className="px-6 py-4 font-bold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMembers.map(member => (
                      <tr key={member.profile.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-brand-mint/10 flex items-center justify-center text-brand-mint text-xs font-bold">
                              {(member.profile.full_name || '?')[0]}
                            </div>
                            <span className="text-sm font-medium text-white">{member.profile.full_name || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/5 text-gray-400">
                            {member.profile.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {member.subscription ? (
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                              member.subscription.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                            }`}>{member.subscription.status}</span>
                          ) : (
                            <span className="text-gray-500 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{member.courseCount}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-24 bg-white/10 rounded-full h-1.5">
                              <div className="bg-brand-mint h-1.5 rounded-full" style={{ width: `${member.completionRate}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{member.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(member.profile.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      // ==========================================================
      // AI BUILDER
      // ==========================================================
      case 'quizzes':
        return (
          <div className="max-w-4xl">
            <div className="mb-12">
              <h1 className="text-2xl font-bold text-white mb-2">Quiz Architect</h1>
              <p className="text-gray-400">Design interactive assessments to validate student learning and issue certifications.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-charcoal-light border border-white/5 p-8 rounded-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Target Lesson ID</label>
                      <input value={quizLessonId} onChange={e => setQuizLessonId(e.target.value)}
                        placeholder="Paste lesson UUID..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-mint/50 focus:outline-none font-mono text-xs" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Quiz Title</label>
                      <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                        placeholder="e.g. Insurance Verification Mastery"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-mint/50 focus:outline-none" />
                    </div>
                  </div>

                  <div className="h-[1px] bg-white/5 w-full" />

                  {/* Questions List */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">Assessment Questions</h3>
                      <button onClick={handleAddQuestion} className="flex items-center gap-2 text-xs text-brand-mint hover:text-brand-teal transition-colors font-bold">
                        <Plus className="h-3 w-3" /> Add Question
                      </button>
                    </div>

                    {quizQuestions.map((q, qi) => (
                      <div key={qi} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-6">
                          <span className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase">
                            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-brand-mint">{qi + 1}</span>
                            Question Detail
                          </span>
                          {quizQuestions.length > 1 && (
                            <button onClick={() => handleRemoveQuestion(qi)} className="text-gray-600 hover:text-red-400 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <input value={q.question} onChange={e => handleQuestionChange(qi, 'question', e.target.value)}
                          placeholder="Ask a question..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white mb-6 focus:border-brand-mint/50 focus:outline-none" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className={`relative flex items-center p-3 rounded-xl border transition-all ${
                              q.correctIndex === oi ? 'bg-brand-mint/5 border-brand-mint/30' : 'bg-black/20 border-white/5'
                            }`}>
                              <input type="radio" name={`q-${qi}-correct`} checked={q.correctIndex === oi}
                                onChange={() => handleQuestionChange(qi, 'correctIndex', oi)}
                                className="mr-3 accent-brand-teal" />
                              <input value={opt} onChange={e => handleOptionChange(qi, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-grow bg-transparent border-none p-0 text-sm text-white focus:ring-0 placeholder:text-gray-700" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSaveQuiz}
                    disabled={savingQuiz || !quizLessonId || !quizTitle}
                    className="w-full py-4 bg-brand-teal text-charcoal font-bold rounded-xl hover:bg-brand-teal/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-teal/10">
                    {savingQuiz ? <Loader className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    <span>{savingQuiz ? 'Building Quiz...' : 'Deploy Quiz to Lesson'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-br from-brand-teal/20 to-charcoal-light p-8 rounded-2xl border border-brand-teal/20 shadow-2xl">
                  <HelpCircle className="h-8 w-8 text-brand-mint mb-6" />
                  <h4 className="text-xl font-bold tracking-tight text-white mb-4">Quiz Strategy</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Effective dental training uses "Scenario-Based" testing. Instead of asking for definitions, ask what a coordinator should do when a claim is denied for a specific reason.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Quiz Metrics</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Average Score</span>
                      <span className="text-brand-mint font-bold">84%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className="bg-brand-mint h-1.5 rounded-full w-[84%]" />
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed italic mt-2">
                      Quizzes help identify which modules need more explanation in your next office training update.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'video-lesson-builder':
        return (
          <div className="max-w-none">
            <VideoLessonBuilder
              courseLessons={courseLessonOptions}
              onSaveMetadata={async (metadata) => {
                await adminSaveVideoLessonMetadata(metadata);
              }}
            />
          </div>
        );
      case 'ai-builder':
        return renderAIBuilder();
        const aiPreview = aiPreviewCourse;
        const aiError = null;
        return (
          <div className="max-w-4xl">
            <div className="mb-12">
              <h1 className="text-2xl font-bold text-white mb-2">AI Course Assistant</h1>
              <p className="text-gray-400">Collaborate with AI to design high-impact dental training programs in seconds.</p>
            </div>

            {aiPreview ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Course Preview Header */}
                <div className="bg-charcoal-light border border-brand-mint/20 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap className="h-32 w-32 text-brand-mint" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-mint bg-brand-mint/10 px-3 py-1 rounded-full">AI Generated Draft</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{normalizeCourseLevel(aiPreview!.level)} • {aiPreview!.duration}</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-4">{aiPreview!.title}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-2xl">{aiPreview!.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleSaveAICourse}
                      disabled={aiStatus.phase === 'saving' || aiStatus.phase === 'done'}
                      className="flex items-center gap-2 bg-brand-teal text-charcoal font-bold py-3 px-8 rounded-xl hover:bg-brand-teal/90 transition-all shadow-lg shadow-brand-teal/20 disabled:opacity-50"
                    >
                      {aiStatus.phase === 'saving' ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      {aiStatus.phase === 'saving' ? 'Saving Academy...' : aiStatus.phase === 'done' ? 'Course Saved!' : 'Confirm & Save Course'}
                    </button>
                    <button 
                      onClick={() => setAiPreviewCourse(null)}
                      className="text-gray-500 hover:text-white font-bold text-sm"
                    >
                      Discard & Start Over
                    </button>
                  </div>
                </div>

                {/* Module Preview */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em] mb-6">Course Outline</h3>
                  {aiPreview!.modules?.map((mod: any, mIdx: number) => (
                    <div key={mIdx} className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-400 font-mono">{mIdx + 1}</span>
                          {mod.title}
                        </h4>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{mod.lessons?.length || 0} Lessons</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mod.lessons?.map((lesson: any, lIdx: number) => (
                          <div key={lIdx} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                            <PlayCircle className="h-3.5 w-3.5 text-brand-mint/40" />
                            <span className="text-xs text-gray-300 truncate">{lesson.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6 bg-charcoal-light border border-white/5 p-8 rounded-2xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">What are we teaching today?</label>
                    <input type="text" placeholder="e.g. Mastering Insurance Appeals"
                      value={courseTopic} onChange={e => setCourseTopic(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white focus:border-brand-mint/50 focus:outline-none placeholder:text-gray-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Target Audience</label>
                      <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white focus:border-brand-mint/50 focus:outline-none">
                        <option>Office Managers</option><option>Billing Coordinators</option>
                        <option>New Front Desk Hires</option><option>Treatment Coordinators</option>
                        <option>Dental Assistants</option><option>Practice Owners</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Course Level</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white focus:border-brand-mint/50 focus:outline-none">
                        <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Key Learning Objectives</label>
                    <textarea rows={4} placeholder="e.g. How to write narratives that get paid on the first submission..."
                      value={learningObjectives} onChange={e => setLearningObjectives(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white focus:border-brand-mint/50 focus:outline-none placeholder:text-gray-600" />
                  </div>
                  
                  <button onClick={handleGenerateCourse}
                    disabled={!courseTopic.trim() || aiStatus.phase === 'generating'}
                    className="w-full py-5 bg-brand-teal text-charcoal font-bold rounded-xl hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-teal/10 disabled:opacity-50">
                    {aiStatus.phase === 'generating' ? (
                      <><Loader className="h-5 w-5 animate-spin" /><span>Consulting with AI...</span></>
                    ) : (
                      <><Zap className="h-5 w-5 fill-charcoal" /><span>Generate Academy Content</span></>
                    )}
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="p-6 rounded-2xl bg-brand-mint/5 border border-brand-mint/10">
                    <h4 className="text-brand-mint font-bold text-xs uppercase tracking-widest mb-4">Pro Tips</h4>
                    <ul className="space-y-4">
                      {[
                        "Be specific about the dental procedures involved.",
                        "Mention specific insurance types (PPO, HMO) if applicable.",
                        "Target learning objectives toward business outcomes like higher collections."
                      ].map((tip, i) => (
                        <li key={i} className="text-xs text-gray-500 leading-relaxed flex gap-3">
                          <span className="text-brand-mint mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-2">Automated Content</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed italic">
                      The AI will generate full course descriptions, structured modules, detailed lesson content, and estimated durations. You can review and edit everything before publishing.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {aiError && (
              <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <p className="text-red-400 text-sm font-medium">{aiError}</p>
              </div>
            )}
          </div>
        );
        return (
          <div className="max-w-3xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Quiz Builder</h1>
              <p className="text-gray-400">Create quizzes for your course lessons.</p>
            </div>

            <div className="space-y-6 bg-charcoal-light border border-white/5 p-8 rounded-2xl">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Lesson ID</label>
                <input value={quizLessonId} onChange={e => setQuizLessonId(e.target.value)}
                  placeholder="Enter the lesson UUID"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-mint/50 focus:outline-none placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Quiz Title</label>
                <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                  placeholder="e.g. Module 1 Knowledge Check"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:border-brand-mint/50 focus:outline-none placeholder-gray-600" />
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Questions</label>
                  <button onClick={handleAddQuestion} className="text-xs text-brand-mint hover:underline font-medium">+ Add Question</button>
                </div>
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 font-bold uppercase">Question {qi + 1}</span>
                      {quizQuestions.length > 1 && (
                        <button onClick={() => handleRemoveQuestion(qi)} className="text-xs text-red-400 hover:underline">Remove</button>
                      )}
                    </div>
                    <input value={q.question} onChange={e => handleQuestionChange(qi, 'question', e.target.value)}
                      placeholder="Enter your question"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-sm mb-3 focus:border-brand-mint/50 focus:outline-none placeholder-gray-600" />
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center space-x-3 cursor-pointer">
                          <input type="radio" name={`q-${qi}-correct`} checked={q.correctIndex === oi}
                            onChange={() => handleQuestionChange(qi, 'correctIndex', oi)}
                            className="accent-brand-teal" />
                          <input value={opt} onChange={e => handleOptionChange(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className="flex-grow bg-white/5 border border-white/10 rounded py-1.5 px-3 text-white text-xs focus:border-brand-mint/50 focus:outline-none placeholder-gray-600" />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleSaveQuiz}
                disabled={savingQuiz || !quizLessonId || !quizTitle}
                className="w-full py-3 bg-brand-teal text-charcoal font-bold rounded-lg hover:bg-brand-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                {savingQuiz ? (
                  <><Loader className="h-4 w-4 animate-spin" /><span>Saving...</span></>
                ) : (
                  <><CheckCircle className="h-4 w-4" /><span>Save Quiz to Lesson</span></>
                )}
              </button>
            </div>
          </div>
        );

      // ==========================================================
      // SETTINGS
      // ==========================================================
      case 'settings':
        return (
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>
            <div className="space-y-6 bg-charcoal-light border border-white/5 p-8 rounded-2xl">
              <h3 className="text-white font-bold mb-4">Platform Configuration</h3>
              <div className="space-y-4 text-sm text-gray-400">
                <p>
                  <strong className="text-gray-300">Supabase:</strong> {import.meta.env.VITE_SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}
                </p>
                <p>
                  <strong className="text-gray-300">Stripe:</strong> {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✅ Configured' : '❌ Not configured'}
                </p>
                <p>
                  <strong className="text-gray-300">AI API:</strong> {import.meta.env.VITE_AI_API_URL ? '✅ Configured' : '❌ Not configured'}
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs text-gray-500">Configuration is managed through environment variables.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-charcoal min-h-screen flex">
      {renderSidebar()}
      <div className="flex-grow p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
