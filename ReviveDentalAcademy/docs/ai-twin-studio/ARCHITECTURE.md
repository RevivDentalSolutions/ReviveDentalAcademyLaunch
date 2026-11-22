# Revive AI Twin Studio — planning-only architecture
Status: DESIGN ONLY. No AI generation, payments, production changes, migrations, or paid compute authorized.
Base: repair/reliable-course-workflow @ cb1285e53edc2b2368aff252264a99a45cee6103; PR #2 remains independent.

## Existing assets
React 19 + Vite + TypeScript frontend; Supabase auth/data/storage; Remotion 4 player, composition, templates and VideoLessonBuilder; Vercel SPA and API routes. Existing /api/video and /api/admin/video-lessons intentionally return 503. Do not remove these guards. Drafts currently use browser localStorage and require durable revisioned persistence before cross-device rendering.

## Proposed architecture
1. Admin selects existing course/lesson revision; server reads authorized content and creates immutable input snapshot with hash, not direct generation.
2. Storyboard planner produces versioned scenes: intro, presenter, diagram, mock-screen demonstration, recap; use human-reviewed scripts and fictional patient data.
3. Human approves narration, visual assets, budget ceiling, likeness consent and render request.
4. Durable job queue with transactional claim, heartbeat, idempotency key, retry cap, cancellation and lease expiry; no rendering inside Vercel functions.
5. Separate containerized GPU worker (local workstation OR rented cloud GPU), behind authenticated job-polling endpoint, downloads private approved assets via short-lived URLs, generates speech and avatar clips.
6. CPU/Remotion worker assembles reusable brand motion graphics, captions, transitions and MP4; storage is private, versioned and never overwrites published media.
7. Admin reviews the finished render; a separate authorized publish operation attaches approved version to the existing lesson without changing progress, quizzes, enrollment or certificates.

## Boundaries
- UI and metadata APIs remain in the existing Vercel project; GPU inference is external and disabled by default.
- Reuse Supabase only after review of RLS, storage policies, backup and migration plan; no new backend created by this document.
- Keep model weights, likeness media, voice recordings and patient/course assets OUT of GitHub and browser bundles. Encrypt private storage, restrict access, use short-lived signed URLs and record consent/revocation.
- Require server-verified admin role, budget and quotas, model allowlist, signed job callbacks, audit trail, prompt injection handling and zero PHI in test fixtures.
- No background generation from a course save. Generation is explicitly opt-in and cost-gated.
- All toggles default OFF: AI_STUDIO_ENABLED, AVATAR_RENDER_ENABLED, PAID_GPU_ENABLED, AUTO_PUBLISH_ENABLED.
- Preview must use isolated test identities and data. Never auto-merge or deploy this branch.
- Credential rotation and PR #2 student-to-certificate acceptance remain separate prerequisites.

## Local/cloud portability
Package model worker with pinned CUDA/Python dependencies, image digest and checkpoint hashes; expose a vendor-neutral job contract. Local workstation and cloud GPU implement the same contract. Avoid long-lived GPU idle billing. Measure actual wall time, VRAM, GPU-hours, artifact size and quality on a 60-second sample before selecting provider.
