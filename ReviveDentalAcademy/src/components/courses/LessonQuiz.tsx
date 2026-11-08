import { useState, useId } from 'react';
import type { CourseQuiz } from '../../lib/courseContent';
export function LessonQuiz({ quiz, onPass }: { quiz: CourseQuiz; onPass: () => Promise<void> }) {
  const quizId = useId();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  return <section className="p-6 border border-secondary/30 rounded-xl space-y-5">
    <h3 className="text-xl text-white">{quiz.title}</h3>
    <p className="text-gray-400">Choose an answer for each question. Score 80% to complete this lesson. You can review and retry.</p>
    {quiz.questions.map((q, i) => <fieldset key={i} className="space-y-2"><legend className="text-white">{i + 1}. {q.question}</legend>
      {q.options.map((option, j) => <label key={j} className="block text-gray-300"><input type="radio" name={`${quizId}-q-${i}`} checked={answers[i] === j} onChange={() => { setAnswers({...answers, [i]: j}); setScore(null); }} /> {option}</label>)}
    </fieldset>)}
    <button className="bg-secondary text-primary rounded-lg px-6 py-3 disabled:opacity-40" disabled={busy || Object.keys(answers).length !== quiz.questions.length} onClick={async () => {
      const result = Math.round(quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length / quiz.questions.length * 100);
      setScore(result); if (result >= 80) { setBusy(true); try { await onPass(); } finally { setBusy(false); } }
    }}>Check answers</button>
    {score !== null && <p role="status" className="text-secondary">Score: {score}%. {score >= 80 ? 'Knowledge check passed.' : 'Review the lesson and try again.'}</p>}
  </section>;
}
