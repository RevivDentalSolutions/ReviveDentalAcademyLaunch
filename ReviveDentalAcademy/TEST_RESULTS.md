# Revive Dental Academy Test Results

Test date: June 20, 2026

## 1. Passed Checks

- `npm run build` passed.
  - TypeScript build completed.
  - Vite production build completed.
  - Vite reported the existing large chunk warning, but it did not fail the build.

- `node --check server/stripe-server.js` passed.

- `node --check server/ai-server.js` passed.

- `.env.example` exists and documents these variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `OPENAI_API_KEY`

## 2. Blocked Checks

These checks were not run because they require live credentials, running services, Stripe CLI, browser interaction, or Supabase access:

- Supabase signup/login verification.
- Stripe test checkout.
- Stripe webhook forwarding with Stripe CLI.
- Membership access after payment.
- Access removal after canceled or failed subscription.
- One-time course purchase access.
- Admin access verification.
- Template/course lock behavior in the browser.
- Supabase table verification after payment/webhook events.

## 3. Exact Missing Environment Variables

No local `.env` file exists. Only `.env.example` is present.

Missing from local runtime configuration:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
```

Also needed by current code or the launch plan but not documented in `.env.example`:

```bash
VITE_STRIPE_API_URL=/api/stripe
SUPABASE_URL=
STRIPE_API_PORT=3001
VITE_AI_API_URL=/api/ai
AI_API_PORT=3002
```

Notes:
- `SUPABASE_URL` can be used by the Stripe and AI servers. The current server code can also fall back to `VITE_SUPABASE_URL`.
- `STRIPE_API_PORT` and `AI_API_PORT` are optional if using defaults.
- `VITE_STRIPE_API_URL` and `VITE_AI_API_URL` are optional for local Vite proxy defaults, but should be explicit in production if APIs are hosted separately.

## 4. Manual Stripe Tasks

1. Use Stripe test mode.
2. Set `STRIPE_SECRET_KEY` from Stripe test API keys.
3. Install and log in to Stripe CLI.
4. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```
5. Copy the CLI webhook secret into:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. Enable these webhook events in Stripe:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
7. Complete a real test-mode membership checkout from the app.
8. Complete a real test-mode one-time course checkout once that purchase entry point is available.
9. Cancel a test subscription in Stripe Dashboard and confirm access is removed.
10. Simulate failed payment and confirm Supabase subscription status updates.

## 5. Manual Supabase Tasks

1. Create or choose a Supabase staging project.
2. Apply the schema from `supabase_schema.md`.
3. Confirm tables exist:
   - `profiles`
   - `courses`
   - `modules`
   - `lessons`
   - `templates`
   - `user_progress`
   - `subscriptions`
   - `purchases`
4. Confirm required constraints exist:
   - `subscriptions.stripe_subscription_id` is unique.
   - `purchases` has unique `(user_id, course_id)`.
5. Confirm the signup trigger creates `profiles` rows.
6. Set server-side `SUPABASE_SERVICE_ROLE_KEY`.
7. After membership checkout, verify:
   ```sql
   select user_id, stripe_subscription_id, stripe_customer_id, status,
          current_period_start, current_period_end, updated_at
   from subscriptions
   order by updated_at desc;
   ```
8. After course purchase, verify:
   ```sql
   select user_id, course_id, stripe_payment_intent_id, amount, status, created_at
   from purchases
   order by created_at desc;
   ```
9. For admin testing, manually promote one test user:
   ```sql
   update profiles
   set role = 'admin'
   where id = '<admin-user-id>';
   ```
10. Review RLS policies before launch, especially premium template/course content access.
