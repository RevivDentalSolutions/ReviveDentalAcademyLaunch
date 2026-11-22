# Milestone 3A: My AI Instructor, mock-only setup

Scope: front-end prototype on feature/academy-ai-twin-studio. No real uploads, no likeness, voice recording, persistence, AI execution, paid GPU, schema migration or publishing.

Route: /admin/ai-instructor. Existing Academy authentication checks for an authenticated admin. Preview deployment also uses Vercel deployment protection. Non-admin users are redirected to the home page or login.

Profile controls: display name, role and teaching style, all ephemeral React state. Generic silhouette and unavailable voice sample state. Two mock consent checklist acknowledgements, not actual consent capture. Privacy details toggle and disabled Generate button. All values reset on refresh.

Verification: node --experimental-strip-types --test tests/ai-instructor-mock.test.mjs (Node 22+). npm run build and existing regression tests required before deployment. The feature must not create or mutate any course/student data. Review authenticated admin deep-link, unauthenticated redirect, keyboard navigation and responsive layout in Preview.

Do not remove Vercel branch deployment suppression; any deployment requires explicit, isolated Preview action.
