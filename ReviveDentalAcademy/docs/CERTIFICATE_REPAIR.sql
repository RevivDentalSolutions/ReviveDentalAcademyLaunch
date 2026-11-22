-- Certificates remain opt-in per course. No rules are enabled by this migration.
CREATE TABLE public.course_completion_rules (
 course_id uuid PRIMARY KEY REFERENCES public.courses(id),
 final_lesson_id uuid NOT NULL REFERENCES public.lessons(id),
 requires_practical boolean NOT NULL DEFAULT true,
 enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE public.practical_reviews (
 course_id uuid NOT NULL REFERENCES public.courses(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 critical_error boolean NOT NULL DEFAULT true,
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(course_id,user_id)
);
CREATE TABLE public.course_certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.courses(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 learner_name text NOT NULL,
 course_title text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(course_id,user_id)
);
ALTER TABLE public.course_completion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_completion_rules,public.practical_reviews,public.course_certificates FROM anon,authenticated;
GRANT SELECT ON public.course_completion_rules,public.practical_reviews,public.course_certificates TO authenticated;
GRANT INSERT,UPDATE ON public.course_completion_rules,public.practical_reviews TO authenticated;
CREATE POLICY "Read course completion rules" ON public.course_completion_rules FOR SELECT TO authenticated USING(true);
CREATE POLICY "Admins configure completion" ON public.course_completion_rules FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
CREATE POLICY "Read own practical review" ON public.practical_reviews FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Admins review practical work" ON public.practical_reviews FOR ALL TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()) AND reviewer_id=auth.uid());
CREATE POLICY "Read own certificates" ON public.course_certificates FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE FUNCTION public.issue_course_certificate(p_course_id uuid) RETURNS public.course_certificates
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); rules public.course_completion_rules; cert public.course_certificates; course_title text; learner text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to request a certificate'; END IF;
 SELECT * INTO rules FROM public.course_completion_rules WHERE course_id=p_course_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Certificates are not enabled for this course yet'; END IF;
 SELECT c.title INTO course_title FROM public.courses c WHERE c.id=p_course_id AND c.published AND (
 EXISTS(SELECT 1 FROM public.purchases p WHERE p.user_id=uid AND p.course_id=c.id AND p.status='completed') OR
 EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=uid AND s.status IN ('active','trialing')));
 IF NOT FOUND THEN RAISE EXCEPTION 'An active enrollment in a published course is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE l.id=rules.final_lesson_id AND m.course_id=p_course_id AND position('<!-- revive-quiz' in l.content)>0) THEN
  RAISE EXCEPTION 'Final assessment configuration needs administrator review';
 END IF;
 -- Lock lesson rows to prevent a simultaneous edit changing requirements mid-issue.
 PERFORM l.id FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE m.course_id=p_course_id FOR SHARE OF l;
 IF EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE m.course_id=p_course_id AND NOT EXISTS(
  SELECT 1 FROM public.user_progress p WHERE p.user_id=uid AND p.lesson_id=l.id)) THEN
  RAISE EXCEPTION 'Complete every required lesson first';
 END IF;
 -- Require a passing attempt for each CURRENT quiz, including the final.
 IF EXISTS(SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id=l.module_id
 WHERE m.course_id=p_course_id AND position('<!-- revive-quiz' in l.content)>0 AND NOT EXISTS(
 SELECT 1 FROM public.quiz_attempts a WHERE a.user_id=uid AND a.lesson_id=l.id AND a.passed
 AND a.quiz_revision=md5((substring(l.content from E'<!-- revive-quiz\n(.*?)\nrevive-quiz -->')::jsonb)::text))) THEN
  RAISE EXCEPTION 'Pass all current knowledge checks and the final assessment first';
 END IF;
 IF rules.requires_practical AND NOT EXISTS(SELECT 1 FROM public.practical_reviews r WHERE r.course_id=p_course_id AND r.user_id=uid AND r.score>=80 AND NOT r.critical_error) THEN
  RAISE EXCEPTION 'Your practical assignment needs instructor approval (80%% with no critical error)';
 END IF;
 SELECT full_name INTO learner FROM public.profiles WHERE id=uid;
 IF nullif(trim(learner),'') IS NULL THEN RAISE EXCEPTION 'Add your full name to your profile first'; END IF;
 INSERT INTO public.course_certificates(course_id,user_id,learner_name,course_title)
 VALUES(p_course_id,uid,learner,course_title) ON CONFLICT(course_id,user_id) DO NOTHING;
 SELECT * INTO cert FROM public.course_certificates WHERE course_id=p_course_id AND user_id=uid;
 RETURN cert;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_course_certificate(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_course_certificate(uuid) TO authenticated;
