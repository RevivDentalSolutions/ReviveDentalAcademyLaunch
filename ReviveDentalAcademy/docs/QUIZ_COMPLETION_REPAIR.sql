-- Additive repair. Apply before deploying the RPC-based player.
-- Answer keys remain in existing lesson content: this is training, not a proctored exam.
CREATE TABLE public.quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 lesson_id uuid NOT NULL REFERENCES public.lessons(id),
 quiz_revision text NOT NULL,
 correct_count integer NOT NULL CHECK (correct_count >= 0),
 question_count integer NOT NULL CHECK (question_count > 0 AND correct_count <= question_count),
 passed boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_lesson ON public.quiz_attempts(user_id,lesson_id);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_attempts FROM anon, authenticated;
GRANT SELECT ON public.quiz_attempts TO authenticated;
CREATE POLICY "Read own quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Privileged write is necessary because clients must not write their own scores.
-- Caller identity and current entitlement are checked inside the function.
CREATE FUNCTION public.submit_lesson_quiz(p_lesson_id uuid, p_answers integer[], p_quiz_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 uid uuid := auth.uid(); lesson_text text; quiz_text text; quiz jsonb;
 q jsonb; n integer; correct integer := 0; i integer; passed boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to submit a quiz'; END IF;
 SELECT l.content INTO lesson_text FROM public.lessons l
 JOIN public.modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id
 WHERE l.id=p_lesson_id AND (public.is_admin(uid) OR (c.published AND (
 EXISTS(SELECT 1 FROM public.purchases p WHERE p.user_id=uid AND p.course_id=c.id AND p.status='completed') OR
 EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=uid AND s.status IN ('active','trialing')))))
 FOR SHARE OF l;
 IF NOT FOUND THEN RAISE EXCEPTION 'Course access is required'; END IF;
 quiz_text := substring(lesson_text from E'<!-- revive-quiz\n(.*?)\nrevive-quiz -->');
 IF quiz_text IS NULL THEN RAISE EXCEPTION 'This lesson has no quiz'; END IF;
 -- Revision is the canonical JSON sent by the player; stale tabs must reload.
 quiz := quiz_text::jsonb;
 IF p_quiz_revision IS NULL OR p_quiz_revision::jsonb IS DISTINCT FROM quiz THEN
  RAISE EXCEPTION 'This quiz changed. Reload the lesson before submitting';
 END IF;
 n := jsonb_array_length(quiz->'questions');
 IF n IS NULL OR n < 1 OR cardinality(p_answers) IS DISTINCT FROM n OR array_lower(p_answers,1) IS DISTINCT FROM 1 THEN
  RAISE EXCEPTION 'Answer every question';
 END IF;
 FOR i IN 0..n-1 LOOP
  q := quiz->'questions'->i;
  IF p_answers[i+1] IS NULL OR p_answers[i+1] < 0 OR p_answers[i+1] >= jsonb_array_length(q->'options') THEN
   RAISE EXCEPTION 'Choose a valid answer for every question';
  END IF;
  IF (q->>'correctIndex')::integer IS NULL OR (q->>'correctIndex')::integer < 0 OR (q->>'correctIndex')::integer >= jsonb_array_length(q->'options') THEN
   RAISE EXCEPTION 'This quiz needs administrator review';
  END IF;
  IF p_answers[i+1] = (q->>'correctIndex')::integer THEN correct := correct+1; END IF;
 END LOOP;
 passed := correct*100 >= n*80;
 INSERT INTO public.quiz_attempts(user_id,lesson_id,quiz_revision,correct_count,question_count,passed)
 VALUES(uid,p_lesson_id,md5(quiz::text),correct,n,passed);
 IF passed THEN
  INSERT INTO public.user_progress(user_id,lesson_id,completed_at) VALUES(uid,p_lesson_id,now())
  ON CONFLICT(user_id,lesson_id) DO NOTHING;
 END IF;
 RETURN jsonb_build_object('correctCount',correct,'questionCount',n,'score',round(correct*100.0/n),'passed',passed);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_lesson_quiz(uuid,integer[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(uuid,integer[],text) TO authenticated;

-- Prevent bypassing quiz grading through the general progress endpoint.
-- Existing progress is preserved. A certificate must require quiz_attempts evidence.
ALTER POLICY "Users can upsert own progress" ON public.user_progress
WITH CHECK(auth.uid()=user_id AND EXISTS(SELECT 1 FROM public.lessons l WHERE l.id=lesson_id AND position('<!-- revive-quiz' in coalesce(l.content,''))=0));
ALTER POLICY "Users can update own progress" ON public.user_progress
USING(auth.uid()=user_id)
WITH CHECK(auth.uid()=user_id AND EXISTS(SELECT 1 FROM public.lessons l WHERE l.id=lesson_id AND position('<!-- revive-quiz' in coalesce(l.content,''))=0));
