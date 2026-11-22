import { supabase, getCourseWithContent } from './supabase';
import { withQuiz, validateCourseDraft, draftRecordId } from './courseContent';
import type { Course, Module, Lesson, Template, Profile, Subscription, VideoPackage, VideoPackageData } from './supabase';
import type { CourseLessonOption, VideoLessonMetadata } from './video-lessons/videoLessonTypes';
import { isCourseLevel, normalizeCourseLevel } from './courseLevel';

const VIDEO_LESSON_METADATA_START = '<!-- revive-video-lesson-builder';
const VIDEO_LESSON_METADATA_END = 'revive-video-lesson-builder -->';

function stripVideoLessonMetadata(content: string) {
  const pattern = new RegExp(`\\n*${VIDEO_LESSON_METADATA_START}[\\s\\S]*?${VIDEO_LESSON_METADATA_END}\\n*`, 'g');
  return content.replace(pattern, '').trim();
}

function readableCourseSaveError(error: unknown): Error {
  const candidate = error as { code?: string; message?: string } | null;
  if (candidate?.code === '23514' || candidate?.message?.includes('courses_level_check')) {
    return new Error('The generated course level was not recognized. Choose Beginner, Intermediate, or Advanced and try again.');
  }
  return error instanceof Error ? error : new Error(candidate?.message || 'The course could not be saved. Please try again.');
}

// ============================================================
// Admin: Course Management
// ============================================================

/** Create a new course */
export async function adminCreateCourse(data: {
  title: string;
  description?: string;
  image_url?: string;
  price?: number;
  level?: string;
  duration?: string;
  published?: boolean;
}): Promise<Course> {
  if (data.published) throw new Error('Save a draft and add lessons before publishing.');
  const level = normalizeCourseLevel(data.level);
  if (!isCourseLevel(level)) throw new Error('Select a valid course level before saving.');
  const { data: course, error } = await supabase
    .from('courses')
    .insert({
      title: data.title,
      description: data.description || '',
      image_url: data.image_url || '',
      price: data.price || 0,
      level,
      duration: data.duration || '',
      published: data.published || false,
    })
    .select('*')
    .single();

  if (error) throw readableCourseSaveError(error);
  return course;
}

/** Update an existing course */
export async function adminUpdateCourse(
  courseId: string,
  data: Partial<{
    title: string;
    description: string;
    image_url: string;
    price: number;
    level: string;
    duration: string;
    published: boolean;
  }>
): Promise<Course> {
  if (data.published) {
    const existing = await getCourseWithContent(courseId);
    validateCourseDraft({ title: data.title || existing.course?.title || '', modules: existing.modules.map(m => ({ title:m.title, lessons:(m.lessons || []).map(l => ({title:l.title,content:l.content || ''})) })) });
  }
  const normalizedData = data.level === undefined ? data : { ...data, level: normalizeCourseLevel(data.level) };
  const { data: course, error } = await supabase
    .from('courses')
    .update({ ...normalizedData, updated_at: new Date().toISOString() })
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) throw readableCourseSaveError(error);
  return course;
}

/** Delete a course (cascades to modules and lessons) */
export async function adminDeleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

/** Get all courses (including unpublished) for admin */
export async function adminGetAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Get every course lesson as a flat picker list for admin tools */
export async function adminGetCourseLessonOptions(): Promise<CourseLessonOption[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, modules(id, lessons(id, title, order))')
    .order('title', { ascending: true });

  if (error) throw error;

  return (data || []).flatMap((course: any) => (
    (course.modules || []).flatMap((module: any) => (
      (module.lessons || [])
        .sort((a: Lesson, b: Lesson) => a.order - b.order)
        .map((lesson: Lesson) => ({
          courseId: course.id,
          courseTitle: course.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
        }))
    ))
  ));
}

/** Add a module to a course */
export async function adminAddModule(courseId: string, title: string, order: number, description = ''): Promise<Module> {
  const { data: module, error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, title, description, order })
    .select('*')
    .single();

  if (error) throw error;
  return module;
}

/** Update an existing module */
export async function adminUpdateModule(
  moduleId: string,
  data: Partial<{ title: string; description: string; order: number }>
): Promise<Module> {
  const { data: module, error } = await supabase
    .from('modules')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', moduleId)
    .select('*')
    .single();

  if (error) throw error;
  return module;
}

/** Add a lesson to a module */
export async function adminAddLesson(
  moduleId: string,
  data: { title: string; content?: string; video_url?: string; duration?: string; order: number }
): Promise<Lesson> {
  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      title: data.title,
      content: data.content || '',
      video_url: data.video_url || '',
      duration: data.duration || '15 min',
      order: data.order,
    })
    .select('*')
    .single();

  if (error) throw error;
  return lesson;
}

/** Update an existing lesson */
export async function adminUpdateLesson(
  lessonId: string,
  data: Partial<{ title: string; content: string; video_url: string; duration: string; order: number }>,
  expectedUpdatedAt?: string
): Promise<Lesson> {
  let query = supabase.from('lessons').update({ ...data, updated_at: new Date().toISOString() }).eq('id', lessonId);
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
  const { data: lesson, error } = await query.select('*').single();
  if (error) throw new Error(error.code === 'PGRST116' ? 'This lesson changed elsewhere. Export your edits and reload before retrying.' : error.message);

  return lesson;
}

/** Save Video Lesson Builder metadata without changing the Supabase schema */
export async function adminSaveVideoLessonMetadata(metadata: VideoLessonMetadata): Promise<Lesson> {
  if (!metadata.lessonId) {
    throw new Error('Choose a course lesson before saving video lesson metadata.');
  }

  const { data: existingLesson, error: fetchError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', metadata.lessonId)
    .single();

  if (fetchError) throw fetchError;

  const contentWithoutMetadata = stripVideoLessonMetadata(existingLesson.content || '');
  const metadataBlock = [
    VIDEO_LESSON_METADATA_START,
    JSON.stringify(metadata, null, 2),
    VIDEO_LESSON_METADATA_END,
  ].join('\n');

  const nextContent = [contentWithoutMetadata, metadataBlock].filter(Boolean).join('\n\n');

  return adminUpdateLesson(metadata.lessonId, {
    content: nextContent,
    video_url: metadata.renderStorageRef || metadata.renderUrl || existingLesson.video_url || '',
  });
}

/** Delete a lesson */
export async function adminDeleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw error;
}

/** Save a generated video package for a lesson */
export async function adminCreateVideoPackage(
  lessonId: string,
  packageData: VideoPackageData
): Promise<VideoPackage> {
  const { data, error } = await supabase
    .from('video_packages')
    .insert({
      lesson_id: lessonId,
      package: packageData,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Get the latest generated video package for each lesson */
export async function adminGetLatestVideoPackages(lessonIds: string[]): Promise<Record<string, VideoPackage>> {
  if (lessonIds.length === 0) return {};

  const { data, error } = await supabase
    .from('video_packages')
    .select('*')
    .in('lesson_id', lessonIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).reduce<Record<string, VideoPackage>>((acc, videoPackage) => {
    if (!acc[videoPackage.lesson_id]) {
      acc[videoPackage.lesson_id] = videoPackage;
    }
    return acc;
  }, {});
}

// ============================================================
// Admin: Template Management
// ============================================================

/** Create a new template */
export async function adminCreateTemplate(data: {
  title: string;
  description?: string;
  category: string;
  file_url: string;
  is_premium?: boolean;
}): Promise<Template> {
  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      title: data.title,
      description: data.description || '',
      category: data.category,
      file_url: data.file_url,
      is_premium: data.is_premium || false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return template;
}

/** Delete a template */
export async function adminDeleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', templateId);
  if (error) throw error;
}

/** Get all templates for admin management */
export async function adminGetAllTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================
// Admin: Member Management
// ============================================================

export interface MemberWithProgress {
  profile: Profile;
  subscription: Subscription | null;
  courseCount: number;
  completedLessons: number;
  totalLessons: number;
  completionRate: number;
}

/** Get all members with their progress stats */
export async function adminGetMembers(): Promise<MemberWithProgress[]> {
  // Get all profiles with role 'member' or 'student'
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;
  if (!profiles || profiles.length === 0) return [];

  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*');

  // Get lesson counts
  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true });

  const subMap = new Map(subscriptions?.map(s => [s.user_id, s]) || []);

  const members: MemberWithProgress[] = await Promise.all(
    profiles.map(async (profile) => {
      const { count: completedLessons } = await supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const { count: courseCount } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed');

      const total = totalLessons || 1;

      return {
        profile,
        subscription: subMap.get(profile.id) || null,
        courseCount: courseCount || 0,
        completedLessons: completedLessons || 0,
        totalLessons: total,
        completionRate: Math.round(((completedLessons || 0) / total) * 100),
      };
    })
  );

  return members;
}

// ============================================================
// Admin: Dashboard Stats
// ============================================================

export interface AdminStats {
  totalCourses: number;
  totalTemplates: number;
  totalMembers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  avgCompletionRate: number;
}

/** Fetch admin dashboard stats from Supabase */
export async function adminGetStats(): Promise<AdminStats> {
  const [coursesRes, templatesRes, profilesRes, subsRes] = await Promise.all([
    supabase.from('courses').select('id, price', { count: 'exact' }),
    supabase.from('templates').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
  ]);

  const totalRevenue = (coursesRes.data || []).reduce(
    (sum, c: any) => sum + (c.price || 0),
    0
  );

  return {
    totalCourses: coursesRes.count || 0,
    totalTemplates: templatesRes.count || 0,
    totalMembers: profilesRes.count || 0,
    activeSubscriptions: subsRes.count || 0,
    totalRevenue,
    avgCompletionRate: 76, // Placeholder - calculated from user_progress in production
  };
}

// ============================================================
// Admin: Quiz Management
// ============================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  id?: string;
  lesson_id: string;
  title: string;
  questions: QuizQuestion[];
}

/** Save a quiz for a lesson */
export async function adminSaveQuiz(quiz: Omit<Quiz, 'id'>): Promise<Quiz> {
  // Read first and use optimistic concurrency: never replace a lesson with quiz text.
  const { data: existing, error: readError } = await supabase.from('lessons')
    .select('content, updated_at').eq('id', quiz.lesson_id).single();
  if (readError) throw readError;
  const { data: lesson, error } = await supabase.from('lessons')
    .update({ content: withQuiz(existing.content || '', quiz), updated_at: new Date().toISOString() })
    .eq('id', quiz.lesson_id).eq('updated_at', existing.updated_at).select('id').single();

  if (error) throw error;

  return {
    ...quiz,
    id: lesson.id,
  };
}
/** Save a full course with modules and lessons (useful for AI generated courses) */
export async function adminSaveFullCourse(courseData: any): Promise<string> {
  validateCourseDraft(courseData);
  const checklistText = courseData.checklist?.length
    ? `\n\n## Course Checklist\n${courseData.checklist.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')}`
    : '';

  const normalizedLevel = normalizeCourseLevel(courseData.level);
  if (!isCourseLevel(normalizedLevel)) throw new Error('Select a valid course level before saving.');

  const courseId = courseData.draftId;
  if (!courseId) throw new Error('This draft needs a stable ID. Export a backup and reopen the course builder.');
  const { data: existing, error: lookupError } = await supabase.from('courses').select('published').eq('id', courseId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.published) throw new Error('This course is already published. Edit it through Manage Courses.');
  const { error: courseError } = await supabase.from('courses').upsert({
    id: courseId, title: courseData.title, description: `${courseData.description || ''}${checklistText}`,
    image_url: courseData.image_url || '', level: normalizedLevel, duration: courseData.duration || '',
    published: false, ...(existing ? {} : { price: 0 }), updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (courseError) throw readableCourseSaveError(courseError);
  try {
    for (const [mi, mod] of courseData.modules.entries()) {
      const moduleId = await draftRecordId(courseId, `module:${mi}`);
      const { error: moduleError } = await supabase.from('modules').upsert({
        id: moduleId, course_id: courseId, title: mod.title, description: mod.description || '', order: mi + 1,
      }, { onConflict: 'id' });
      if (moduleError) throw moduleError;
      for (const [li, lesson] of mod.lessons.entries()) {
        const text = lesson.script ? `${lesson.content}\n\n## Training Script\n\n${lesson.script}` : lesson.content;
        const content = li === mod.lessons.length - 1 && mod.quiz?.questions?.length ? withQuiz(text, mod.quiz) : text;
        const { error: lessonError } = await supabase.from('lessons').upsert({
          id: await draftRecordId(courseId, `module:${mi}:lesson:${li}`), module_id: moduleId,
          title: lesson.title, content, video_url: lesson.video_url || '', duration: lesson.duration || '', order: li + 1,
        }, { onConflict: 'id' });
        if (lessonError) throw lessonError;
      }
    }
  } catch (error) {
    throw new Error(`Some of this draft is saved. Retry Save to resume the same course (${courseId}). ${readableCourseSaveError(error).message}`);
  }
  return courseId;
}
