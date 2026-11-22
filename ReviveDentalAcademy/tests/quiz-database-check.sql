BEGIN;
DO $test$
DECLARE lid uuid; q jsonb; ans integer[]; result jsonb; uid uuid;
BEGIN
 SELECT id INTO uid FROM public.profiles WHERE role='admin' LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 SELECT id, substring(content from E'<!-- revive-quiz\n(.*?)\nrevive-quiz -->')::jsonb INTO lid,q
 FROM public.lessons WHERE content LIKE '%<!-- revive-quiz%' LIMIT 1;
 SELECT array_agg(((x->>'correctIndex')::int+1)%jsonb_array_length(x->'options') ORDER BY ord) INTO ans FROM jsonb_array_elements(q->'questions') WITH ORDINALITY t(x,ord);
 result := public.submit_lesson_quiz(lid,ans,q::text);
 IF (result->>'passed')::boolean THEN RAISE EXCEPTION 'Failed answers passed'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_progress WHERE user_id=uid AND lesson_id=lid) THEN RAISE EXCEPTION 'Fail wrote completion'; END IF;
 SELECT array_agg((x->>'correctIndex')::int ORDER BY ord) INTO ans FROM jsonb_array_elements(q->'questions') WITH ORDINALITY t(x,ord);
 result := public.submit_lesson_quiz(lid,ans,q::text);
 IF NOT (result->>'passed')::boolean OR NOT EXISTS(SELECT 1 FROM public.user_progress WHERE user_id=uid AND lesson_id=lid) THEN RAISE EXCEPTION 'Pass did not record completion'; END IF;
 BEGIN
  PERFORM public.submit_lesson_quiz(lid,ans,'{}');
  RAISE EXCEPTION 'STALE_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='STALE_ACCEPTED' THEN RAISE; END IF; END;
 UPDATE public.profiles SET role='student' WHERE id=uid;
 BEGIN
  PERFORM public.submit_lesson_quiz(lid,ans,q::text);
  RAISE EXCEPTION 'UNPAID_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='UNPAID_ACCEPTED' THEN RAISE; END IF; END;
END $test$;
ROLLBACK;
SELECT 'pass, fail, stale quiz, and unpaid access checks passed; all test writes rolled back' AS result;
