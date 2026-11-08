export interface CourseQuiz {
  title: string;
  questions: { question: string; options: string[]; correctIndex: number }[];
}
const quizBlock = /<!-- revive-quiz\n([\s\S]*?)\nrevive-quiz -->/g;
export function validateQuiz(quiz: CourseQuiz) {
  if (!quiz.title.trim() || !quiz.questions.length || quiz.questions.some(q =>
    !q.question.trim() || q.options.length < 2 || q.options.some(o => !o.trim()) ||
    !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length
  )) throw new Error('Add a title, complete questions, and a valid answer for every question.');
}
export function withQuiz(content: string, quiz: CourseQuiz): string {
  validateQuiz(quiz);
  return `${content.replace(quizBlock, '').trim()}\n\n<!-- revive-quiz\n${JSON.stringify(quiz)}\nrevive-quiz -->`;
}
export function readQuiz(content: string): CourseQuiz | null {
  const match = new RegExp(quizBlock.source).exec(content);
  if (!match) return null;
  try { const quiz = JSON.parse(match[1]); validateQuiz(quiz); return quiz; } catch { return null; }
}
export function courseProgress(lessonIds: string[], completedIds: string[]) {
  const completed = new Set(completedIds);
  const ids = [...new Set(lessonIds)];
  const count = ids.filter(id => completed.has(id)).length;
  return { count, percent: ids.length ? Math.round(count / ids.length * 100) : 0 };
}
export function validateCourseDraft(course: {title: string; modules: {title:string; lessons:{title:string;content:string}[];quiz?:CourseQuiz}[]}) {
  if (!course.title?.trim() || !course.modules?.length) throw new Error('Add a course title and at least one module.');
  for (const module of course.modules) {
    if (!module.title?.trim() || !module.lessons?.length) throw new Error('Every module needs a title and at least one lesson.');
    if (module.lessons.some(l => !l.title?.trim() || !l.content?.trim())) throw new Error('Every lesson needs a title and written content. Video is optional.');
    if (module.quiz) validateQuiz(module.quiz);
  }
}
export async function draftRecordId(draftId: string, path: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${draftId}:${path}`)));
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes.slice(0,16), b => b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
