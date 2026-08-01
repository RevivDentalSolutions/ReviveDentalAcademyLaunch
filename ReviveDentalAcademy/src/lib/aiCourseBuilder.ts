import { supabase } from './supabase';
import type { VideoLessonMetadata } from './video-lessons/videoLessonTypes';
import type { VideoPackageData } from './supabase';
import type { CourseLevel } from './courseLevel';

// ============================================================
// Types
// ============================================================

export interface AICourseRequest {
  topic: string;
  audience: string;
  objectives: string;
  prompt?: string;
  preview?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface AIGeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
}

export interface AIChecklist {
  title: string;
  items: string[];
}

export const REVIVE_VIDEO_BRAND_PROMPT = `Revive Dental Solutions video brand: dark charcoal background, soft aqua and teal accents, clean modern sans-serif typography, luxury healthcare SaaS aesthetic, realistic dental office visuals, professional calm high-trust tone, soft lighting, elegant minimal composition, no cartoon style, no cheesy stock footage feel. Visual direction: modern dental office, clean front desk, confident administrative team, practical training platform, cinematic but grounded.`;

function toReadableString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface AIVideoStoryboardScene {
  scene: string;
  narration: string;
  onScreenText: string;
  suggestedVisuals: string;
}

export interface AILessonVideoScript {
  narrationScript: string;
  storyboard: AIVideoStoryboardScene[];
  onScreenText: string[];
  suggestedVisuals: string[];
  videoPrompt: string;
}

export interface AIGeneratedLesson {
  title: string;
  content: string;
  script?: string;
  video_url?: string;
  duration: string;
  order: number;
}

export interface AIGeneratedModule {
  title: string;
  description: string;
  order: number;
  lessons: AIGeneratedLesson[];
  quiz?: AIGeneratedQuiz;
}

export interface AIGeneratedCourse {
  title: string;
  description: string;
  level: CourseLevel | string;
  duration: string;
  image_url: string;
  modules: AIGeneratedModule[];
  checklist?: string[];
  scripts?: string[];
}

export interface AIGenerationResult {
  courseId?: string;
  course?: AIGeneratedCourse;
  hasQuiz?: boolean;
  hasChecklist?: boolean;
  error?: string;
  success: boolean;
}

export type AIGenerationStatus = 
  | { phase: 'idle' }
  | { phase: 'generating'; message: string }
  | { phase: 'saving' }
  | { phase: 'done'; courseId: string }
  | { phase: 'error'; error: string };

// ============================================================
// AI Course Builder API
// ============================================================

const AI_API_URL = import.meta.env.VITE_AI_API_URL || '/api/ai';

/**
 * Generate a full course with AI (includes modules, lessons, quizzes, checklists).
 */
export async function generateCourse(
  request: AICourseRequest,
  onStatus?: (status: AIGenerationStatus) => void
): Promise<AIGenerationResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'You must be signed in to generate courses.' };
    }

    onStatus?.({ phase: 'generating', message: 'Connecting to AI engine...' });

    const response = await fetch(`${AI_API_URL}/generate-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error ? toReadableString(parsed.error) : `Server error: ${response.status}`;
      } catch {
        errorMessage = `Server error: ${response.status}`;
      }
      return { success: false, error: errorMessage };
    }

    onStatus?.({ phase: 'saving' });

    const result = await response.json();

    if (result.course) {
      if (result.courseId) {
        onStatus?.({ phase: 'done', courseId: result.courseId });
      }
      return {
        success: true,
        courseId: result.courseId,
        course: result.course,
        hasQuiz: result.hasQuiz,
        hasChecklist: result.hasChecklist,
      };
    }

    if (result.courseId) {
      onStatus?.({ phase: 'done', courseId: result.courseId });
      return {
        success: true,
        courseId: result.courseId,
        course: result.course,
        hasQuiz: result.hasQuiz,
        hasChecklist: result.hasChecklist,
      };
    }

    return { success: false, error: 'No course was created.' };
  } catch (err: any) {
    const errorMsg = err.message || 'An unexpected error occurred.';
    onStatus?.({ phase: 'error', error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Generate a quiz for an existing lesson via AI.
 */
export async function generateQuiz(
  lessonTitle: string,
  lessonContent?: string,
  moduleTitle?: string
): Promise<AIGeneratedQuiz | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch(`${AI_API_URL}/generate-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonTitle, lessonContent, moduleTitle }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.quiz || null;
  } catch {
    return null;
  }
}

/**
 * Generate a checklist for a course topic via AI.
 */
export async function generateChecklist(
  topic: string,
  moduleTitles?: string[]
): Promise<AIChecklist | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch(`${AI_API_URL}/generate-checklist`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, moduleTitles }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.checklist || null;
  } catch {
    return null;
  }
}

/**
 * Generate a branded short-form video script and video prompt for a lesson.
 */
export async function generateLessonVideoScript(request: {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonContent?: string | null;
}): Promise<{ success: boolean; video?: AILessonVideoScript; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch(`${AI_API_URL}/generate-lesson-video-script`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...request,
        brandPrompt: REVIVE_VIDEO_BRAND_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      try {
        const parsed = JSON.parse(errorBody);
        return { success: false, error: parsed.error ? toReadableString(parsed.error) : `Server error: ${response.status}` };
      } catch {
        return { success: false, error: `Server error: ${response.status}` };
      }
    }

    const data = await response.json();
    return { success: true, video: data.video };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate video script.' };
  }
}

/**
 * Generate a structured AI Video Factory package for a lesson.
 */
export async function generateVideoPackage(request: {
  lessonTitle: string;
  lessonContent?: string | null;
  courseTitle: string;
}): Promise<{ success: boolean; package?: VideoPackageData; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch('/api/ai/generate-video-package', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      try {
        const parsed = JSON.parse(errorBody);
        return { success: false, error: parsed.error ? toReadableString(parsed.error) : `Server error: ${response.status}` };
      } catch {
        return { success: false, error: `Server error: ${response.status}` };
      }
    }

    const data = await response.json();
    return { success: true, package: data.package };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate video package.' };
  }
}

export async function generateVideoScenePlan(request: {
  lessonTitle: string;
  narration: string;
  targetSceneCount?: number;
  style: "revive-academy";
  includeQuiz: boolean;
  includeAvatarIntro: boolean;
  includeAvatarOutro: boolean;
}): Promise<{ success: boolean; lesson?: Partial<VideoLessonMetadata>; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch(`${AI_API_URL}/generate-video-scene-plan`, { method: 'POST', headers, body: JSON.stringify(request) });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) return { success: false, error: data.error || `Server error: ${response.status}` };
    return { success: true, lesson: data.lesson };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate scene plan.' };
  }
}

/**
 * Fallback: demo course when AI API is unavailable.
 */
export function getFallbackGeneratedCourse(topic: string): AIGeneratedCourse {
  const safeTitle = topic || 'Untitled Course';
  return {
    title: safeTitle,
    description: `A comprehensive course on ${safeTitle} designed for dental office professionals. Covers essential skills, best practices, and real-world scenarios.`,
    level: 'intermediate',
    duration: '3 modules · 9 lessons · 2.5 hours',
    image_url: '',
    checklist: [
      'Review all course materials before the next team meeting',
      'Implement the verification checklist with your front desk team',
      'Track denial rates weekly to measure improvement',
    ],
    modules: [
      {
        title: `1. Foundations of ${safeTitle}`,
        description: `Build a strong foundation in ${safeTitle} with core concepts and terminology.`,
        order: 1,
        quiz: {
          title: 'Module 1: Knowledge Check',
          questions: [
            { question: 'What is the primary goal of this module?', options: ['Learn fundamentals', 'Skip to advanced', 'Take a break', 'Review later'], correctIndex: 0 },
            { question: 'Which best describes best practices?', options: ['Proven workflows', 'Random guesses', 'Old methods', 'No standards'], correctIndex: 0 },
            { question: 'How should you measure success?', options: ['Track KPIs', 'Ignore data', 'Ask a friend', 'Guess'], correctIndex: 0 },
          ],
        },
        lessons: [
          {
            title: 'Introduction to Key Concepts',
            content: `# Introduction\n\nWelcome to this course on ${safeTitle}. In this lesson, we'll cover the fundamental concepts that every dental professional needs to know.\n\n## Learning Objectives\n- Understand the core principles\n- Identify key terminology\n- Recognize common scenarios`,
            duration: '15 min',
            order: 1,
          },
          {
            title: 'Industry Best Practices',
            content: `# Best Practices\n\nLearn the proven strategies and workflows used by top-performing dental offices.\n\n## Key Takeaways\n- Implement standardized workflows\n- Avoid common pitfalls\n- Measure your success`,
            duration: '12 min',
            order: 2,
          },
        ],
      },
      {
        title: `2. Advanced ${safeTitle} Strategies`,
        description: `Take your knowledge further with advanced techniques and real-world applications.`,
        order: 2,
        quiz: {
          title: 'Module 2: Knowledge Check',
          questions: [
            { question: 'What is a key advanced strategy?', options: ['Real-world application', 'Theory only', 'Skip practice', 'Ignore feedback'], correctIndex: 0 },
            { question: 'How do you handle complex situations?', options: ['Use case studies', 'Panic', 'Give up', 'Ignore'], correctIndex: 0 },
          ],
        },
        lessons: [
          {
            title: 'Real-World Applications',
            content: `# Real-World Applications\n\nApply what you've learned to real dental office scenarios.\n\n## Case Studies\n- Scenario 1: Common challenge\n- Scenario 2: Advanced problem-solving\n- Scenario 3: Complex situation`,
            duration: '18 min',
            order: 1,
          },
          {
            title: 'Measuring Success',
            content: `# Measuring Success\n\nLearn how to track your progress and measure the impact of your new skills.\n\n## KPIs to Track\n- Efficiency metrics\n- Accuracy rates\n- Patient satisfaction scores`,
            duration: '10 min',
            order: 2,
          },
        ],
      },
    ],
  };
}
