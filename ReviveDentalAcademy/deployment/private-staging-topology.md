# Private staging topology

This folder is a deployment blueprint only. It does not create hosting, change Supabase, create Stripe products, or publish the unfinished first course.

For Vercel imports, set the project Root Directory to `ReviveDentalAcademy`. The repository now includes `vercel.json` plus catch-all API wrappers for the existing AI, Stripe, video, and admin-video routes. These wrappers do not start local listeners on Vercel.

## Services

| Service | Runs | Public exposure | Responsibility |
| --- | --- | --- | --- |
| `academy-web` | Vite static build | Private staging domain | Admin and student interface. |
| `academy-api-ai` | `server/ai-server.js` | API gateway only | Admin-only course, quiz, narration, and scene-plan generation. |
| `academy-api-stripe` | `server/stripe-server.js` | API gateway; webhook route public | Server-owned checkout and verified Stripe webhook processing. |
| `academy-video` | `server/video-server.js` | API gateway only | Admin-only uploads, render-job enqueue/status, and authenticated signed lesson playback. |
| `academy-video-worker` | `server/video-worker.js` | No public traffic | Claims one queued Remotion job, uploads the private MP4, updates the lesson and job status. |

The existing synchronous render endpoint remains temporarily for local backward compatibility. New staging work should use `render-jobs`; the dedicated worker processes `video_render_jobs` outside the browser request.

## Required staging domains

- `staging.academy...` — static frontend, protected to you/admin test users.
- `api-staging.academy...` — gateway to the AI, Stripe, and video services.

Set `VITE_API_BASE_URL` to the API gateway origin at build time. Keep `APP_URL` equal to the staging frontend origin. Put both origins in `ALLOWED_ORIGINS` only when cross-origin requests are necessary.

## Staging sequence (do not skip)

1. Create a new Supabase **staging** project; do not use production data.
2. Review and apply `supabase/migrations/20260801140000_academy_foundation.sql` to staging.
3. Create one admin test user and set that user’s profile role to `admin` with a controlled server/database action.
4. Add secrets to the host’s secret manager only; never to `.env.example`, source, browser variables, or GitHub.
5. Build/deploy the frontend and the three services behind a private staging gateway.
6. Use Stripe **test mode** and configure only the staging webhook URL.
7. Test: login, admin AI generation, a short Remotion render, storage upload, protected playback, a test checkout, webhook access grant, cancellation, and denied access.

## Runtime environment separation

### Frontend build-time values

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL`.

### API and worker secrets

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_OFFICE_PRO_MONTHLY`, `APP_URL`, and `ALLOWED_ORIGINS`.

`HEYGEN_*` remains optional and is not required for the first course.

## Container files

The Dockerfiles are intentionally separate so the expensive Remotion runtime cannot compete with checkout/webhook processing. Build and test them only after the staging secrets and Supabase project exist; do not run them with production credentials.
