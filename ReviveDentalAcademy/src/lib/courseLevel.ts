export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];

/** Convert AI/display-formatted levels to the value accepted by courses.level. */
export function normalizeCourseLevel(level: unknown): CourseLevel {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('advanced')) return 'advanced';
  if (normalized.includes('intermediate')) return 'intermediate';
  return 'beginner';
}

export function isCourseLevel(level: unknown): level is CourseLevel {
  return COURSE_LEVELS.includes(level as CourseLevel);
}
