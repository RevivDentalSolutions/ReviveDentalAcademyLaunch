BEGIN;
DO $test$
DECLARE uid uuid; cid uuid; lid uuid; lesson_row record; q jsonb; ans integer[]; cert public.course_certificates; second_cert public.course_certificates;
BEGIN
 SELECT id INTO uid FROM public.profiles WHERE role='admin' LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 SELECT c.id INTO cid FROM public.courses c WHERE c.title='Dental Insurance Verification: From Eligibility to Accurate Patient Estimates' LIMIT 1;
 SELECT l.id INTO lid FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE m.course_id=cid ORDER BY m."order" DESC,l."order" DESC LIMIT 1;
 INSERT INTO public.course_completion_rules(course_id,final_lesson_id,enabled) VALUES(cid,lid,true);
 UPDATE public.courses SET published=true WHERE id=cid;
 INSERT INTO public.purchases(user_id,course_id,amount,status) VALUES(uid,cid,0,'completed');
 BEGIN
  PERFORM public.issue_course_certificate(cid); RAISE EXCEPTION 'INCOMPLETE_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Complete every required lesson%' THEN RAISE; END IF; END;
 INSERT INTO public.user_progress(user_id,lesson_id,completed_at) SELECT uid,l.id,now() FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE m.course_id=cid ON CONFLICT DO NOTHING;
 BEGIN
  PERFORM public.issue_course_certificate(cid); RAISE EXCEPTION 'NO_QUIZ_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Pass all current knowledge checks%' THEN RAISE; END IF; END;
 FOR lesson_row IN SELECT l.id,l.content FROM public.lessons l JOIN public.modules m ON m.id=l.module_id WHERE m.course_id=cid AND l.content LIKE '%<!-- revive-quiz%' LOOP
  q:=substring(lesson_row.content from E'<!-- revive-quiz\n(.*?)\nrevive-quiz -->')::jsonb;
  SELECT array_agg((x->>'correctIndex')::int ORDER BY ord) INTO ans FROM jsonb_array_elements(q->'questions') WITH ORDINALITY t(x,ord);
  PERFORM public.submit_lesson_quiz(lesson_row.id,ans,q::text);
 END LOOP;
 BEGIN
  PERFORM public.issue_course_certificate(cid); RAISE EXCEPTION 'NO_PRACTICAL_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Your practical assignment needs%' THEN RAISE; END IF; END;
 INSERT INTO public.practical_reviews(course_id,user_id,reviewer_id,score,critical_error) VALUES(cid,uid,uid,80,false);
 cert:=public.issue_course_certificate(cid);
 second_cert:=public.issue_course_certificate(cid);
 IF cert.id IS NULL OR cert.id<>second_cert.id THEN RAISE EXCEPTION 'Issuance is not idempotent'; END IF;
END $test$;
ROLLBACK;
SELECT 'certificate prerequisites and repeat issuance passed; all fixtures rolled back' AS result;
