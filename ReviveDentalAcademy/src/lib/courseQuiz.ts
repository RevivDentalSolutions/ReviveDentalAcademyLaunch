export type CourseQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type CourseQuiz = {
  title: string;
  questions: CourseQuizQuestion[];
};

const quizMarker = /<!--\s*revive-quiz-data:([A-Za-z0-9+/=]+)\s*-->/gi;

function encode(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

function decode(value: string) {
  return decodeURIComponent(escape(atob(value)));
}

export function readCourseQuiz(content: string | null | undefined): CourseQuiz | null {
  if (!content) return null;
  const match = quizMarker.exec(content);
  quizMarker.lastIndex = 0;
  if (!match?.[1]) return readLegacyCourseQuiz(content);

  try {
    const parsed = JSON.parse(decode(match[1])) as Partial<CourseQuiz>;
    if (!parsed.title || !Array.isArray(parsed.questions) || !parsed.questions.length) return null;
    const questions = parsed.questions
      .filter((question) => question?.question?.trim() && Array.isArray(question.options) && question.options.filter(Boolean).length >= 2)
      .map((question) => ({
        question: question.question.trim(),
        options: question.options.filter(Boolean).slice(0, 4),
        correctIndex: Math.max(0, Number(question.correctIndex || 0)),
      }));
    return questions.length ? { title: parsed.title.trim(), questions } : null;
  } catch {
    return readLegacyCourseQuiz(content);
  }
}

// Earlier AI-generated courses saved quizzes as readable markdown. Keep those
// courses usable while newly saved quizzes use the private structured marker.
function readLegacyCourseQuiz(content: string): CourseQuiz | null {
  const quizStart = /##\s*(?:📝\s*)?([^\n]*(?:knowledge check|quiz)[^\n]*)\n([\s\S]*)$/im.exec(content);
  if (!quizStart) return null;

  const questions: CourseQuizQuestion[] = [];
  const questionPattern = /\*\*Q\d+:\*\*\s*([^\n]+)([\s\S]*?)(?=\*\*Q\d+:\*\*|$)/g;
  let questionMatch: RegExpExecArray | null;
  while ((questionMatch = questionPattern.exec(quizStart[2]))) {
    const options: string[] = [];
    let correctIndex = 0;
    questionMatch[2].split('\n').forEach((line) => {
      const optionMatch = /^\s*([✅✓○])\s+(.+?)\s*$/.exec(line);
      if (!optionMatch) return;
      if (optionMatch[1] === '✅' || optionMatch[1] === '✓') correctIndex = options.length;
      options.push(optionMatch[2]);
    });
    if (options.length >= 2) questions.push({ question: questionMatch[1].trim(), options: options.slice(0, 4), correctIndex });
  }

  return questions.length ? { title: quizStart[1].replace(/^📝\s*/, '').trim(), questions } : null;
}

export function stripCourseQuiz(content: string | null | undefined) {
  return (content || '').replace(quizMarker, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function writeCourseQuiz(content: string | null | undefined, quiz: CourseQuiz) {
  const cleanQuiz: CourseQuiz = {
    title: quiz.title.trim(),
    questions: quiz.questions.map((question) => ({
      question: question.question.trim(),
      options: question.options.filter(Boolean).slice(0, 4),
      correctIndex: Math.max(0, Number(question.correctIndex || 0)),
    })),
  };
  return `${stripCourseQuiz(content)}\n\n<!-- revive-quiz-data:${encode(JSON.stringify(cleanQuiz))} -->`.trim();
}
