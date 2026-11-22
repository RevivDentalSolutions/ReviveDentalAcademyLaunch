-- Applied November 20, 2026; preserves administrator policies and all rows.
ALTER POLICY "Anyone can read lessons of published courses" ON public.lessons
USING (EXISTS (
 SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id
 WHERE m.id = lessons.module_id AND c.published = true AND (
 EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = auth.uid() AND p.course_id = c.id AND p.status = 'completed')
 OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('active','trialing'))
)));
ALTER POLICY "Users can upsert own progress" ON public.user_progress
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id));
ALTER POLICY "Users can update own progress" ON public.user_progress
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id));
