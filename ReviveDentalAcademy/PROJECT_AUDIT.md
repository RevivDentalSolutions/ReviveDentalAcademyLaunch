# Revive Dental Academy Project Audit

Audit date: June 20, 2026  
Project root: `C:\Users\boate\Downloads\shared-files-435944cc-69f6-4cb2-89a1-f11551c052b7\revive-dental-academy`

## 1. Tech Stack

### Framework
- Frontend: Vite single-page application.
- UI: React 19 with React Router 7.
- Styling: Tailwind CSS 4, custom CSS variables/classes, Framer Motion, Lucide React icons.
- Backend services: two standalone Express servers in `server/`:
  - `server/stripe-server.js` on port `3001`.
  - `server/ai-server.js` on port `3002`.

### Language
- Frontend: TypeScript / TSX.
- Backend: JavaScript ES modules.
- Database schema: PostgreSQL SQL intended for Supabase.

### Database
- Supabase Postgres.
- Supabase Auth is used for identity.
- Supabase Storage is specified for course images, templates, and lesson videos.
- Row Level Security is documented in `supabase_schema.md`, but there is no migration folder or executable SQL migration in the app repo.

### Authentication
- Supabase email/password authentication through `@supabase/supabase-js`.
- Profile data is stored in `profiles`, keyed to `auth.users.id`.
- Role-based access is based on `profiles.role` with values `admin`, `member`, and `student`.
- `/admin` is protected in the React router by checking authenticated user plus `profile.role === 'admin'`.
- `/course-player/:courseId` performs runtime access checks for a signed-in user, active subscription, admin/member role, or completed course purchase.

### Payment Processing
- Stripe client dependency: `@stripe/stripe-js`.
- Stripe backend dependency: `stripe`.
- `server/stripe-server.js` can create Checkout Sessions and accept webhook events.
- Current frontend checkout path in `src/lib/checkoutService.ts` does not call the Stripe server. It simulates payment success, writes Supabase `subscriptions` or `purchases` directly from the browser client, and updates `profiles.role` to `member` after a simulated membership checkout.
- Webhooks currently log Stripe events only. They do not write subscription or purchase updates to Supabase.

### Hosting Requirements
- Static frontend hosting for Vite output, such as Vercel, Netlify, Cloudflare Pages, or any static host that supports SPA fallback to `index.html`.
- A server runtime for Stripe and AI endpoints, or equivalent Supabase Edge Functions.
- Supabase project with Auth, Postgres tables, RLS policies, and Storage buckets.
- Stripe account with real Price IDs, webhook endpoint, and webhook secret.
- OpenAI API key for AI course generation.
- Production hosting must expose:
  - Frontend SPA.
  - `/api/stripe/*` endpoint.
  - `/api/ai/*` endpoint.
  - Stripe webhook endpoint reachable by Stripe.

## 2. Project Structure

### Root Files
- `package.json`: npm scripts and dependency list.
- `package-lock.json`: locked dependency graph.
- `vite.config.ts`: Vite config, dev port `5173`, proxies `/api/stripe` to `localhost:3001` and `/api/ai` to `localhost:3002`.
- `tsconfig*.json`: TypeScript project configuration.
- `eslint.config.js`: ESLint flat config.
- `tailwind.config.js`, `postcss.config.js`: styling configuration.
- `.env.example`: documented environment variables.
- `README.md`: default Vite template text, not project-specific.
- `start.sh`: starts AI server, Stripe server, and Vite dev server for a Linux path `/home/team/shared/revive-dental-academy`; this path does not match this Windows project location.
- `ai-server.log`, `stripe-server.log`, `dev-server.log`: previous local server logs. They show servers ran, but logs contain mojibake/encoding artifacts.

### Generated / Dependency Folders
- `node_modules/`: installed dependencies. Should not be committed or deployed as source.
- `dist/`: built Vite frontend output. Should be regenerated during deployment.

### `public/`
- Static assets served directly by Vite:
  - `favicon.svg`
  - `icons.svg`

### `server/`
- `ai-server.js`: Express API for AI course and quiz generation. Uses OpenAI and Supabase service role key.
- `stripe-server.js`: Express API for Stripe Checkout Session creation, coupon creation, health check, and webhook receipt.

### `src/`
- `main.tsx`: React entry point; mounts `App` inside `BrowserRouter`.
- `App.tsx`: top-level route definitions and auth initialization.
- `index.css`, `App.css`: global styling.

### `src/assets/`
- `hero.png`, `react.svg`, `vite.svg`. `hero.png` is application-specific; Vite/React SVGs look like template leftovers.

### `src/components/`
- `components/layout/`: shared layout shell.
  - `Layout.tsx`: wraps page content with navbar/footer.
  - `Navbar.tsx`: navigation, sign-in/account state, membership CTA.
  - `Footer.tsx`: footer UI.
- `components/courses/`:
  - `CourseCard.tsx`: reusable course listing card and course-player link behavior.
- `components/ui/`:
  - `CheckoutModal.tsx`: simulated checkout modal with coupons, upsells, and placeholder card fields.
  - `MembershipCTA.tsx`: Office Pro promotional section.

### `src/context/`
- `UserContext.tsx`: local `isOfficePro` context. It is not wired into `main.tsx` or `App.tsx`; current real membership state comes from `useAuthStore` and Supabase profiles.

### `src/store/`
- `authStore.ts`: Zustand store for Supabase session, profile, auth state, and sign-out.

### `src/lib/`
- `supabase.ts`: Supabase client, table interfaces, auth helpers, course/template/progress/subscription/purchase queries.
- `stripe.ts`: Stripe publishable-key loader, demo Stripe price constants, demo coupons, price formatting.
- `checkoutService.ts`: checkout orchestration and simulated payment success writes to Supabase.
- `adminService.ts`: admin CRUD helpers for courses, modules, lessons, templates, members, stats, quiz saving, and saving full AI-generated courses.
- `aiCourseBuilder.ts`: frontend API client for AI course/quiz/checklist generation plus fallback generated course data.

### `src/pages/`
- `Home.tsx`: marketing/home page.
- `auth/LoginPage.tsx`: sign in and sign up.
- `courses/CourseLibrary.tsx`: public course catalog backed by Supabase `courses`.
- `courses/CoursePlayer.tsx`: member/purchase-gated lesson player backed by Supabase `courses`, `modules`, `lessons`, and `user_progress`.
- `templates/TemplateLibrary.tsx`: template library backed by Supabase `templates`.
- `membership/MembershipPage.tsx`: Office Pro sales and checkout page.
- `membership/OfficeProDashboard.tsx`: Office Pro member dashboard with hardcoded resource sections.
- `resources/ResourceCenter.tsx`: hardcoded knowledge base/resource center.
- `admin/AdminDashboard.tsx`: admin area with overview, course management, template management, members, AI course builder, quiz builder, and settings tabs.

### Key Entry Points
- Browser entry: `index.html` -> `src/main.tsx` -> `src/App.tsx`.
- Main app routes:
  - `/`
  - `/courses`
  - `/templates`
  - `/membership`
  - `/resources`
  - `/training`
  - `/login`
  - `/admin`
  - `/course-player/:courseId`
- API entry points:
  - `node server/stripe-server.js`
  - `node server/ai-server.js`

### Admin Areas
- Route: `/admin`.
- Component: `src/pages/admin/AdminDashboard.tsx`.
- Protection: frontend route guard checks `profile.role === 'admin'`.
- Admin capabilities intended in code:
  - Dashboard stats.
  - Course create/delete/list.
  - Template create/delete/list.
  - Member progress overview.
  - AI course generation.
  - Quiz builder.
  - Settings status display.

### Membership Areas
- Route: `/membership`.
- Non-member view: `MembershipPage`.
- Member/admin view: `OfficeProDashboard`.
- Course access: `/course-player/:courseId` checks profile role, active subscription, or one-time purchase.
- Template access: premium templates are visually locked for non-members in the UI, but database RLS as documented allows all authenticated users to read premium templates unless app logic blocks them.

## 3. Environment Variables

### Variables in `.env.example`

| Variable | Required For | Purpose | Status |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend, AI server fallback | Supabase project URL for browser client and server fallback. | Missing in actual project because no `.env` file exists. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public Supabase anon key for browser-side Auth/PostgREST access. | Missing in actual project. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe publishable key for `loadStripe`. | Missing in actual project. |
| `SUPABASE_SERVICE_ROLE_KEY` | AI server, future webhooks | Server-only Supabase key for privileged database writes. | Missing in actual project. |
| `STRIPE_SECRET_KEY` | Stripe server | Server-only Stripe key used to create sessions/coupons. | Missing in actual project. Stripe log says server was in demo/no-secret mode. |
| `STRIPE_WEBHOOK_SECRET` | Stripe server | Verifies incoming Stripe webhook signatures. | Missing in actual project. |
| `OPENAI_API_KEY` | AI server | Calls OpenAI for course and quiz generation. | Missing in actual project. Prior `ai-server.log` shows it was configured in some earlier runtime, but no local `.env` is present. |

### Variables Used in Code But Missing From `.env.example`

| Variable | Required For | Purpose | Status |
| --- | --- | --- | --- |
| `VITE_STRIPE_API_URL` | Frontend checkout service | Intended backend URL for Stripe API; defaults to `/api/stripe`. Currently unused because real fetch is commented out. | Not documented. |
| `VITE_AI_API_URL` | Frontend AI service | AI API base URL; defaults to `/api/ai`. | Not documented. |
| `STRIPE_API_PORT` | Stripe server | Optional override for Stripe server port, default `3001`. | Not documented. |
| `AI_API_PORT` | AI server | Optional override for AI server port, default `3002`. | Not documented. |
| `SUPABASE_URL` | AI server | Alternate server-side Supabase URL. | Not documented. |

### Missing Variable Summary
- There is no `.env` file in the project root, only `.env.example`.
- For local production-like operation, all required values are missing.
- The frontend falls back to placeholder Supabase values, which prevents real database use and can hide configuration mistakes until runtime.
- `VITE_AI_API_URL` and `VITE_STRIPE_API_URL` should be documented even if defaults work in Vite dev via proxy.

## 4. Database Analysis

The schema is documented in `supabase_schema.md`. There are no checked-in migrations or Supabase CLI config, so the database must currently be created manually from the markdown.

### Tables

#### `profiles`
- Extends `auth.users`.
- Primary key: `id`, references `auth.users(id)` on delete cascade.
- Fields: `full_name`, `avatar_url`, `role`, `created_at`, `updated_at`.
- Role values: `admin`, `member`, `student`.
- Trigger: `handle_new_user()` auto-creates a student profile on signup.
- Used by frontend auth state and route gating.

#### `courses`
- Stores course metadata: title, description, image, price, level, duration, published flag.
- Referenced by `modules` and `purchases`.
- Public reads are intended only for published courses.

#### `modules`
- Belongs to `courses` through `course_id`.
- Orders modules by integer `order` unique per course.
- Cascades on course delete.

#### `lessons`
- Belongs to `modules` through `module_id`.
- Contains title, markdown/rich content, video URL, duration, and order.
- Cascades on module delete.

#### `templates`
- Downloadable library content.
- Fields include title, description, category, file URL, and `is_premium`.
- Categories in schema: `verification`, `scheduling`, `billing`, `forms`, `other`.
- UI categories include `Appeal Letters`, `Phone Scripts`, and `SOPs`, which do not map cleanly to the schema check constraint.

#### `user_progress`
- Tracks completed lessons per user.
- Unique pair: `user_id`, `lesson_id`.
- Used by `CoursePlayer` to mark lessons complete and calculate progress.

#### `subscriptions`
- Tracks Office Pro subscription state.
- Fields include user ID, Stripe subscription/customer IDs, plan type, status, current period, timestamps.
- Intended statuses: `incomplete`, `active`, `past_due`, `canceled`, `unpaid`, `trialing`.
- Used by `hasActiveSubscription()`.

#### `purchases`
- Tracks one-time course purchases.
- Unique pair: `user_id`, `course_id`.
- Fields include Stripe payment intent ID, amount, status.
- Used by `hasPurchasedCourse()`.

### Relationships
- `auth.users` 1:1 `profiles`.
- `courses` 1:N `modules`.
- `modules` 1:N `lessons`.
- `auth.users` N:M `lessons` through `user_progress`.
- `auth.users` 1:N `subscriptions` by schema, though app upsert expects one row per user via `onConflict: 'user_id'`. The schema does not declare `UNIQUE(user_id)`, so this upsert will fail unless a unique constraint is added.
- `auth.users` N:M `courses` through `purchases`, with one completed purchase per user/course.

### Users, Memberships, Courses, and Payments
- User signs up through Supabase Auth.
- A database trigger creates a `profiles` row with role `student`.
- Student can browse published courses and templates.
- Office Pro membership is represented two ways:
  - `profiles.role = 'member'` or `admin` in frontend access checks.
  - `subscriptions.status IN ('active', 'trialing')` in `hasActiveSubscription()`.
- One-time course access is represented by a `purchases` row with `status = 'completed'`.
- Current checkout does not complete real Stripe payment before writing subscription/purchase records. It calls `handleSuccessfulPayment()` directly from the browser after a simulated checkout.
- Stripe webhooks are not yet connected to Supabase writes, so real Stripe subscription changes would not update app access.

## 5. Feature Inventory

### Narrative Generator
- No dedicated narrative generator feature exists.
- Narrative-related content exists as static labels/resources, such as `Narrative Library` in `OfficeProDashboard` and narrative references in `ResourceCenter` and course copy.
- AI Course Builder could generate lesson content about narratives, but it is not a targeted narrative-generation workflow.

### Course Builder
- Manual admin course creation exists in `AdminDashboard` and `adminService`.
- Admin services support creating courses, modules, lessons, templates, quizzes, and full generated courses.
- The current UI only exposes basic course fields for manual creation; full module/lesson editing is incomplete.
- AI-generated course preview/save is intended, but the admin dashboard currently has compile-breaking missing state and imports.

### Membership Portal
- Sales page: `MembershipPage`.
- Member dashboard: `OfficeProDashboard`.
- Role gating: `App.tsx` chooses member dashboard for `member` or `admin` profile roles.
- Dashboard content is currently mostly static/hardcoded and does not query membership resources from Supabase.

### Stripe Integration
- Stripe server can create checkout sessions if `STRIPE_SECRET_KEY` exists.
- Frontend checkout currently does not call `POST /api/stripe/create-checkout-session`.
- Checkout modal contains placeholder read-only card fields, not Stripe Elements.
- Demo coupons are stored client-side.
- Stripe webhook handler verifies signatures but does not update `subscriptions` or `purchases`.
- Stripe price constants are placeholders: `price_office_pro_monthly`, `price_bootcamp`.

### User Authentication
- Supabase Auth sign-in/sign-up is implemented.
- Zustand auth store initializes session and profile.
- Login/signup page exists.
- Admin route guard exists.
- Course player checks authenticated user before loading course access.
- `authStore.initialize()` registers `onAuthStateChange` but does not retain or unsubscribe from the subscription; this can become a cleanup issue if the store is reinitialized.

### Knowledge Base
- `ResourceCenter` implements a polished knowledge base UI.
- Content is hardcoded in the component, not database-backed.
- Search input is controlled but not used to filter results.
- Premium markers are visual only; resource click/download actions are placeholders.

### AI Features
- `server/ai-server.js` integrates with OpenAI using `gpt-4o-mini`.
- Implemented endpoints:
  - `GET /api/ai/health`
  - `POST /api/ai/generate-course`
  - `POST /api/ai/generate-quiz`
- Frontend AI client supports `generateCourse`, `generateQuiz`, and `generateChecklist`.
- `generateChecklist` calls `/api/ai/generate-checklist`, but the server does not implement that endpoint despite logging it as available.
- AI server uses Supabase service role and inserts generated course data directly into the database.
- The server does not verify that the bearer token belongs to an admin before allowing course generation and database insertion.

## 6. Bugs and Risks

### Verified Build / TypeScript Failures
`node node_modules\typescript\bin\tsc --noEmit -p tsconfig.app.json` fails.

Major compile-breaking errors include:
- `src/pages/admin/AdminDashboard.tsx`
  - `aiPreviewCourse` and `setAiPreviewCourse` are used but never declared.
  - `PlayCircle` is used but not imported.
  - `aiStatus.error` is accessed without narrowing the union type.
- `src/pages/courses/CoursePlayer.tsx`
  - `ShieldCheck`, `BookOpen`, and `ExternalLink` are used but not imported.
- Multiple no-unused errors caused by strict TypeScript settings.
- `src/context/UserContext.tsx` imports `ReactNode` as a value instead of type-only under `verbatimModuleSyntax`.

`node node_modules\typescript\bin\tsc --noEmit -p tsconfig.node.json` passes.

### Verified ESLint Failures
`node node_modules\eslint\bin\eslint.js .` reports 42 errors.

Important ones:
- `App.tsx`: `AdminRoute` component is declared during render.
- `CheckoutModal.tsx` and `AdminDashboard.tsx`: state is set synchronously inside effects per React hooks lint.
- `AdminDashboard.tsx`: multiple `any` usages, unused variables, lexical declarations in case blocks.
- Several unused imports across pages and components.

### Missing Files / Missing Implementation
- No `.env` file exists.
- No Supabase migration files exist.
- No project-specific README exists; current README is the default Vite README.
- No tests are present.
- No CI configuration is present.
- No production deployment config is present.
- No real Stripe Elements integration exists.
- No implemented `/api/ai/generate-checklist` endpoint exists.
- No dedicated Narrative Generator exists.
- No actual template files under `public/templates/` are present despite schema seed URLs like `/templates/verification-form.pdf`.
- No course image files under `/images/courses/` are present despite schema seed URLs.

### Broken Imports / Runtime Errors
- Course player references icons that are not imported, so the app cannot compile.
- Admin dashboard references AI preview state that is never declared, so the app cannot compile.
- Admin dashboard JSX includes nested `<button>` elements in the course creation header, which is invalid interactive markup and can cause UI/event bugs.
- Course player previous/next buttons do not update lesson indexes.
- Template download buttons do not actually navigate to or download `template.file_url`.
- Resource search input does not filter content.
- Course library categories are `Insurance`, `Billing`, etc., but filtering compares them to `course.level`, so category filtering will not work correctly.

### Security Concerns
- Browser-side simulated checkout can grant membership or course purchases without a verified Stripe payment.
- `handleSuccessfulPayment()` writes access records from the client using the anon Supabase client. If RLS allows these writes, users can potentially grant themselves access.
- Stripe webhook does not update Supabase, so production payment state will drift from app access state.
- AI server uses service role key but does not verify requester identity or admin role before inserting courses.
- `CoursePlayer` renders lesson content with `dangerouslySetInnerHTML` from database content without sanitization. If admins or AI insert unsafe HTML, this creates XSS risk.
- Template premium access is enforced only in UI. The documented RLS policy allows all authenticated users to read premium templates because it checks `is_premium = false OR auth.role() = 'authenticated'`.
- Supabase service role and Stripe secret must never be exposed to Vite/frontend env variables.
- CORS is enabled broadly on backend servers.

### Deployment Concerns
- The app currently does not compile, so it cannot be cleanly deployed from source.
- `start.sh` uses a Linux path that does not match this project location and is not production-grade process management.
- `dist/` exists, but it may not reflect current source because current source fails TypeScript checks.
- The frontend relies on Vite dev proxy for `/api/stripe` and `/api/ai`; production static hosting needs equivalent rewrites/proxies or absolute API URLs.
- Webhook endpoint needs raw body parsing and must be publicly reachable over HTTPS.
- Real Stripe Price IDs are not configured.
- Database RLS policies must be actually applied in Supabase before launch.
- Schema/app mismatch: `subscriptions` needs a unique `user_id` constraint if the app uses `upsert(..., onConflict: 'user_id')`.

## 7. Deployment Instructions

### Exact Steps to Run Locally

1. Install Node.js 20+.
2. From project root, install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in at minimum:
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_STRIPE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   STRIPE_SECRET_KEY=...
   STRIPE_WEBHOOK_SECRET=...
   OPENAI_API_KEY=...
   ```
5. In Supabase, manually run the SQL from `supabase_schema.md`, including tables, triggers, RLS policies, indexes, seed data, and storage buckets.
6. Start the AI server:
   ```bash
   node server/ai-server.js
   ```
7. Start the Stripe server in another terminal:
   ```bash
   node server/stripe-server.js
   ```
8. Start the Vite frontend in another terminal:
   ```bash
   npm run dev
   ```
9. Open the app:
   ```text
   http://localhost:5173
   ```
10. Verify health endpoints:
   ```text
   http://localhost:5173/api/ai/health
   http://localhost:5173/api/stripe/health
   ```

Important: the source currently fails TypeScript checks. Fix compile errors before relying on local behavior.

### Exact Steps to Deploy

1. Fix TypeScript and ESLint blockers so `npm run build` passes.
2. Move database schema from markdown into real migrations or Supabase SQL files.
3. Apply Supabase schema to the production Supabase project.
4. Configure Supabase Auth email/password settings and production redirect URLs.
5. Create Supabase Storage buckets:
   - `course-images`
   - `templates`
   - `lesson-videos`
6. Upload referenced course images, template files, and lesson videos, or update database records to valid URLs.
7. Create real Stripe products/prices for:
   - Office Pro monthly membership.
   - Course one-time purchases.
8. Replace placeholder price IDs in `src/lib/stripe.ts` or move product lookup to the server.
9. Deploy backend APIs using one of these approaches:
   - Supabase Edge Functions for Stripe and AI endpoints, recommended for Supabase-centric deployment.
   - A Node host such as Render, Railway, Fly.io, or a VPS.
   - Vercel/Netlify serverless functions with raw-body support for Stripe webhooks.
10. Set backend environment variables securely:
    ```bash
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    STRIPE_SECRET_KEY=...
    STRIPE_WEBHOOK_SECRET=...
    OPENAI_API_KEY=...
    ```
11. Deploy frontend static app with:
    ```bash
    npm run build
    ```
    Publish `dist/`.
12. Set frontend environment variables at build time:
    ```bash
    VITE_SUPABASE_URL=...
    VITE_SUPABASE_ANON_KEY=...
    VITE_STRIPE_PUBLISHABLE_KEY=...
    VITE_AI_API_URL=https://your-api-domain/api/ai
    VITE_STRIPE_API_URL=https://your-api-domain/api/stripe
    ```
13. Configure SPA fallback so all frontend routes serve `index.html`.
14. Configure Stripe webhook endpoint:
    ```text
    https://your-api-domain/api/stripe/webhook
    ```
15. Subscribe to at least these Stripe events:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
16. Implement webhook database writes before launch. Webhooks should be the source of truth for `subscriptions` and `purchases`.
17. Smoke test:
    - Sign up.
    - Sign in.
    - Admin role routing.
    - Course listing from Supabase.
    - Membership checkout using Stripe test mode.
    - Stripe webhook updates Supabase.
    - Course-player access after purchase/subscription.
    - Template premium lock behavior.
    - AI course generation as admin only.

## 8. Recommended Next Steps

1. Fix compile blockers first.
   - Declare AI preview state in `AdminDashboard`.
   - Add missing icon imports in `AdminDashboard` and `CoursePlayer`.
   - Narrow `aiStatus` before reading `error`.
   - Remove or fix strict TypeScript unused imports/variables.

2. Replace simulated checkout with real server-backed Stripe Checkout.
   - Frontend should call `/api/stripe/create-checkout-session`.
   - Browser should redirect to Stripe Checkout.
   - Supabase access should be granted only by verified webhook events.

3. Secure the AI server.
   - Verify Supabase bearer tokens.
   - Require admin role before allowing course generation or database insertion.
   - Add rate limits and stricter CORS.

4. Convert `supabase_schema.md` into migrations.
   - Add missing `UNIQUE(user_id)` on `subscriptions` or update app upsert logic.
   - Fix premium template RLS.
   - Add storage policies that match membership access needs.

5. Finish admin CMS workflows.
   - Add module/lesson editing UI.
   - Add upload flows for videos, images, PDFs, and templates.
   - Add publish/unpublish controls.

6. Implement the missing AI checklist endpoint or remove the frontend client method.

7. Make course player functional.
   - Wire previous/next navigation.
   - Render markdown safely instead of raw unsanitized HTML.
   - Persist notes if intended.
   - Implement quiz loading/submission separately from lesson body text.

8. Make resources and templates data-backed.
   - Move hardcoded ResourceCenter and OfficeProDashboard content into Supabase tables or CMS data.
   - Wire search, categories, premium access, and downloads.

9. Add project-specific documentation.
   - Replace default Vite README with local setup, schema setup, Stripe setup, AI setup, and deployment notes.

10. Add tests and CI.
    - Typecheck and lint in CI.
    - Add basic route/component tests.
    - Add integration tests for access checks and checkout webhook handling.
