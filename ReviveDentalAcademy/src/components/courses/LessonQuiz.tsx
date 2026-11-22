import { useState, useId } from 'react';
import type { CourseQuiz } from '../../lib/courseContent';
export function LessonQuiz({ quiz, onPass, submit }: { quiz: CourseQuiz; onPass: () => Promise<void>; submit?: (answers: number[]) => Promise<{score: number; passed: boolean}> }) {
  const quizId = useId();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [passed, setPassed] = useState(false);
  const [busy, setBusy] = useState(false);
  return <section className="p-6 border border-secondary/30 rounded-xl space-y-5">
    <h3 className="text-xl text-white">{quiz.title}</h3>
    <p className="text-gray-400">Choose an answer for each question. Score 80% to complete this lesson. You can review and retry.</p>
    {quiz.questions.map((q, i) => <fieldset key={i} className="space-y-2"><legend className="text-white">{i + 1}. {q.question}</legend>
      {q.options.map((option, j) => <label key={j} className="block text-gray-300"><input type="radio" name={`${quizId}-q-${i}`} disabled={busy} checked={answers[i] === j} onChange={() => { setAnswers({...answers, [i]: j}); setScore(null); }} /> {option}</label>)}
    </fieldset>)}
    <button className="bg-secondary text-primary rounded-lg px-6 py-3 disabled:opacity-40" disabled={busy || Object.keys(answers).length !== quiz.questions.length} onClick={async () => {
      setBusy(true); setError(''); setScore(null); setPassed(false);
      try {
        const correct = quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length;
        const result = submit ? await submit(quiz.questions.map((_, i) => answers[i])) : {
          score: Math.round(correct / quiz.questions.length * 100), passed: correct * 100 >= quiz.questions.length * 80,
        };
        if (result.passed) await onPass();
        setScore(result.score); setPassed(result.passed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The result could not be saved. Please retry.');
      } finally { setBusy(false); }
    }}>Check answers</button>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {score !== null && <p role="status" className="text-secondary">Score: {score}%. {passed ? 'Knowledge check passed.' : 'Review the lesson and try again.'}</p>}
  </section>;
}
