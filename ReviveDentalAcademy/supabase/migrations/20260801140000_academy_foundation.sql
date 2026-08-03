-- Revive Dental Academy: additive automation-job foundation.
--
-- This project already has its core Academy schema, roles, RLS policies, and
-- storage buckets. Keep this migration intentionally narrow: it must be safe
-- to apply to that existing project and must not replace its current access
-- policies or customer data.

create extension if not exists pgcrypto;

-- Captures a course-generation request and its reviewed output. The current
-- builder can continue writing courses directly; this table enables a durable
-- review/approval queue when that workflow is switched on.
create table if not exists public.course_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  input jsonb not null,
  output jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'needs_review', 'completed', 'failed', 'canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One durable unit of work per rendered lesson. Vercel functions create and
-- inspect jobs; the renderer claims and completes them using the service role.
create table if not exists public.video_render_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  lesson_payload jsonb not null,
  storage_bucket text,
  storage_path text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists course_generation_jobs_status_created_idx
  on public.course_generation_jobs(status, created_at);
create index if not exists video_render_jobs_status_created_idx
  on public.video_render_jobs(status, created_at);

-- Service-role requests bypass RLS. Browser clients receive no policy here,
-- so neither queue is exposed through the public Data API.
alter table public.course_generation_jobs enable row level security;
alter table public.video_render_jobs enable row level security;
