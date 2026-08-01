create table if not exists public.video_packages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  package jsonb not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists video_packages_lesson_id_created_at_idx
  on public.video_packages (lesson_id, created_at desc);

