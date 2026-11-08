# Academy repair plan — November 7, 2026

Status: review branch only. Do not merge or deploy as a launch-ready release.
Existing repository, application, Vercel project, and Supabase project retained.

## Why finishing a course was unreliable

1. `vite.config.ts` proxies AI/Stripe/video to localhost ports 3002/3001/3003 only during development. The repository has standalone Express listeners, not deployed Vercel handlers. A frontend build passing does not establish API availability.
2. AI draft storage held the prompt/audience/objectives but not generated modules and lessons. A refresh lost generated work. Preview was mostly read-only.
3. Saving a generated course involved many independent inserts; an error deleted the partial course. Retry could create another course. There was no transaction or durable recovery identity.
4. Quiz saving overwrote the lesson content. Generated quizzes were text with visible checkmarks, while the player quiz button was a disabled placeholder.
5. Ordinary lesson edits needed manual saves. Responses could overwrite more recent typing. Video local-storage failures were not handled.
6. Player progress counted lessons from all courses, duplicates accumulated, and Previous/Next buttons lacked handlers. Completion errors were only logged.
7. The auth subscription awaited another Supabase query inside its callback and could accumulate subscriptions during initialization.
8. Rendering runs synchronously with Remotion and filesystem output. This is not a durable background-job implementation. Existing job tables do not mean jobs are connected.

## Reviewable changes in this branch

- Persist complete generated drafts and topic; retain prior draft on generation failure; import text/Markdown or course JSON; export JSON backups.
- Inline lesson/module/title/quiz editing with the existing player renderer for student preview. This is a Markdown editor with preview, not a full rich-text/slides/activity authoring suite.
- Stable draft and child IDs make retries upsert the same records. Partial work is retained. This is resumable client saving, not an atomic transaction. The editor does not support deleting/reordering modules during partial recovery.
- Preserve teaching and video metadata when adding or replacing structured quiz metadata. Optimistic concurrency detects overlapping quiz/lesson edits.
- Debounced database lesson autosave, browser recovery copies, visible failure state, and an unsaved-navigation warning. AI drafts still use browser persistence until explicitly saved; cross-device AI draft recovery is pending.
- Interactive formative quizzes with 80% threshold. Answers are still client-visible and scoring is client-side: NOT sufficient for credential issuance or tamper-resistant certification. Existing legacy checkmark quizzes are preserved, not silently converted.
- Course-specific progress, duplicate protection, working previous/next navigation, visible progress errors, and safer player state resets.
- Safer auth event handling; server-side admin authentication on the AI service. Other server endpoints remain launch blockers (see private audit).
- Empty courses/lessons cannot be published through the editor. Video is not a publishing requirement.
- Video draft storage/save errors are surfaced honestly.
- Exact review-branch Vercel auto-deployment suppression, at both possible config roots. Main branch deployment behavior is unchanged.

## Prioritized next work and release gates

| Priority | Work | Acceptance evidence |
|---|---|---|
| P0 | Resolve exposed credential and database authorization findings described in the private audit. Keep sales unavailable. | Revoked credential confirmed; student cannot change role; unpaid user cannot read paid lesson bodies, videos, or premium resources through direct APIs. |
| P0 | Put short AI and checkout handlers in the existing deployment, with authentication, input validation, rate limits and timeouts; provision correct production env targets. | Authenticated admin generation succeeds; anonymous/student requests fail; errors retain draft. No secret in frontend assets. |
| P1 | Move draft saves/publishing into an authorized transaction/RPC with revision checks; use existing generation jobs for server recovery if suitable. | Fault injection midway through save; retry/reload/cross-device resume produce one complete draft. |
| P1 | Load the recovered owner-review course JSON, review PDF-derived layout, preserve originals. | 18 teaching lessons, 6 cases, 30 checks, 20 final questions and practical assignment reviewed in the real student player. |
| P1 | Implement server-graded attempts and instructor practical approval, then certificate issuance. | Complete lessons + final 16/20 + practical 80/100/no critical error produce one persistent certificate; failure/forged client state cannot. |
| P1 | Finish signup/login/reset/email-confirmation flows and direct course return links. | Dedicated test student can register, sign in, resume on a second session, and access only authorized courses. |
| P1 | Repair checkout trust boundaries and webhook idempotency; test with Stripe test mode. | Price/user identity cannot be altered by client; paid event grants access once; failed/unpaid/refunded cases behave correctly. |
| P2 | Make video a separate, resumable optional job in existing infrastructure; secure uploads, remote fetching and signed URLs. | Failed render leaves text publishable; completed video attaches once; signed URLs require current entitlement. |
| P2 | Slides, narration and richer interactive blocks after the basic workflow passes. | A whole text-first course can already be authored, resumed, previewed and published reliably. |

No database changes or live writes were performed in this audit. SQL changes must be reviewed against current policies and applied only after approval and backup verification. Do not remove old records, replace the existing application, or create a second backend/project.

## Recovered course and preservation

The original 131-page Rise PDF and September 2026 learner/workbook/instructor editions were located. The staged JSON reuses the later edition, which documents its reuse of the Rise source. Original documents remain untouched. No SCORM or editable Rise project was located in the repository; no SCORM import is claimed. Course content is kept outside this public repository.

The staged import retains the practical-assessment requirement. It is not honest to issue a completion certificate from the current browser quiz alone. A certificate must record learner, course/version, completion date, unique certificate ID and assessment evidence; it must not claim accredited CE or professional licensure.

## Connect to Revive Dental Solutions

Keep getrevivedental.com as the sales/marketing site. Its course CTA should lead to an Academy course detail/checkout route. Require Academy sign-in, resolve price and course ID on the server, create checkout with the verified user ID, and grant access from a verified payment webhook. A success-page redirect must never grant access. After checkout, display confirmed enrollment or pending processing and a Start/Resume Course link. Send course access email only through the authorized production integration after successful entitlement creation. Keep account, receipt and refund/support links clear.

Use the existing academy.getrevivedental.com domain, already verified on the existing Vercel project. No DNS changes are needed merely to attach it again. Test deep links and refresh routing before release.

## Validation and limitations

- Baseline and updated TypeScript/Vite builds pass. Bundle-size warning remains (~1.1 MB JS).
- `node --test tests/*.test.mjs`: 9 passing tests covering content preservation, validation, bounded progress, deterministic IDs, partial-save retry and AI authorization.
- Browser component harness: edit, refresh recovery, Markdown rendering, preview isolation, incorrect answer, retry, and passing result observed.
- The browser harness uses fictional content and local storage. It does NOT verify real auth, database autosave, checkout, publishing, completion certificates or the complete end-to-end workflow.
- Vercel metadata/domain/env names were readable; protected deployment fetch was denied with 403. Live endpoint behavior is unverified.
- No live student account created, no live course published, no payment made, no certificate issued. No new features should be added until the P0/P1 acceptance workflow is demonstrated.

## Review workflow

1. Run `npm ci --ignore-scripts`, `node --test tests/*.test.mjs`, and `npm run build` inside ReviveDentalAcademy.
2. Inspect the branch diff and private audit. Keep production deployment blocked.
3. Approve a scoped deployment/configuration and database repair only after the remaining P0 fixes are ready for review.
4. Run the full acceptance workflow with dedicated test identities and Stripe test mode. Preserve live records and original course materials.
5. Obtain final publication approval before enabling the course or public sales.

Reference: https://vercel.com/docs/project-configuration/git-configuration documents exact-branch `git.deploymentEnabled: false`.
