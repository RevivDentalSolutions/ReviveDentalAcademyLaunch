# Revive Dental Academy Launch Test Plan

Use Stripe test mode and a Supabase staging/project copy first. Do not run launch testing against production customers until every item below passes.

## 1. Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example`.
3. Fill in all local test values.
4. Start the Stripe server:
   ```bash
   node server/stripe-server.js
   ```
5. Start the AI server if needed:
   ```bash
   node server/ai-server.js
   ```
6. Start the frontend:
   ```bash
   npm run dev
   ```
7. Open:
   ```text
   http://localhost:5173
   ```
8. Confirm:
   - Frontend loads.
   - Login page loads.
   - `/api/stripe/health` returns `status: ok`.

Supabase checks:
 - No database rows are expected from local startup alone.

## 2. Supabase Env Variables

Required frontend variables:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_API_URL=/api/stripe
```

Required Stripe server variables:
```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional server variable:
```bash
STRIPE_API_PORT=3001
```

Test steps:
1. Restart all servers after editing `.env`.
2. Sign up a test user.
3. Sign in as that user.
4. Confirm the user has a row in `profiles`.

Supabase checks:
 - `profiles`: test user exists.
 - `profiles.role`: should be `student` unless manually made admin.
 - `subscriptions`: no row yet.
 - `purchases`: no row yet.

## 3. Stripe Test Checkout

1. Sign in as a non-admin test user.
2. Go to `/membership`.
3. Click the Office Pro checkout button.
4. Confirm the app redirects to Stripe Checkout.
5. Use Stripe test card:
   ```text
   4242 4242 4242 4242
   ```
6. Use any future expiration date and any CVC.
7. Complete checkout.
8. Confirm Stripe redirects back to the configured success URL.

Supabase checks before webhook delivery:
 - `subscriptions`: may still be empty until the webhook arrives.
 - `profiles.role`: should not be changed by the browser.

## 4. Stripe Webhook Test Using Stripe CLI

1. Install and log in to Stripe CLI.
2. Forward webhooks to the local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```
3. Copy the webhook signing secret from Stripe CLI output.
4. Set:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Restart `server/stripe-server.js`.
6. Repeat a membership checkout.
7. Watch the Stripe server terminal for successful webhook logs.

Useful Stripe CLI trigger:
```bash
stripe trigger checkout.session.completed
```

Note: CLI-triggered generic events may not include this app's required `user_id`, `product_id`, and `product_type` metadata. The best end-to-end test is a real test-mode checkout from the app.

Supabase checks:
 - `subscriptions.user_id`: matches the test Supabase user.
 - `subscriptions.stripe_subscription_id`: populated.
 - `subscriptions.stripe_customer_id`: populated.
 - `subscriptions.status`: `active` or `trialing`.
 - `subscriptions.current_period_start`: populated.
 - `subscriptions.current_period_end`: populated.

## 5. Membership Access After Payment

1. Complete a membership checkout in test mode.
2. Wait for `checkout.session.completed`.
3. Refresh the app.
4. Go to `/membership`.
5. Confirm the app shows `OfficeProDashboard`, not the sales page.
6. Go to `/courses`.
7. Confirm course cards are unlocked for the paid user.
8. Go to `/templates`.
9. Confirm premium templates are not locked for the paid user.

Supabase checks:
 - `subscriptions.status`: must be `active` or `trialing`.
 - `subscriptions.user_id`: matches the signed-in user.
 - `profiles.role`: does not need to be `member`.

## 6. Access Removal After Canceled/Failed Subscription

Cancellation test:
1. In Stripe Dashboard test mode, find the test subscription.
2. Cancel it.
3. Confirm `customer.subscription.deleted` is delivered.
4. Refresh the app.
5. Confirm `/membership` shows the sales page for the user.
6. Confirm premium courses/templates are locked.

Failed payment test:
1. Use Stripe test tools to simulate failed renewal or trigger:
   ```bash
   stripe trigger invoice.payment_failed
   ```
2. Confirm `invoice.payment_failed` is delivered.
3. Confirm the local subscription row updates to the latest Stripe status.
4. Refresh the app.
5. Confirm access is removed if status is no longer `active` or `trialing`.

Supabase checks:
 - `subscriptions.status`: should become `canceled`, `past_due`, `unpaid`, or another non-access status supported by the schema.
 - `subscriptions.current_period_start`: updated from Stripe when available.
 - `subscriptions.current_period_end`: updated from Stripe when available.
 - User should not have Office Pro access unless another active/trialing row exists.

## 7. One-Time Course Purchase Access

1. Sign in as a non-admin user without an active subscription.
2. Start a one-time course checkout from a course purchase flow.
3. Complete Stripe test checkout.
4. Confirm `checkout.session.completed` is delivered.
5. Refresh the app.
6. Open that course player route.
7. Confirm the purchased course is accessible.
8. Confirm other non-purchased premium courses remain locked unless the user has an active subscription.

Supabase checks:
 - `purchases.user_id`: matches the test user.
 - `purchases.course_id`: matches the purchased course.
 - `purchases.stripe_payment_intent_id`: populated.
 - `purchases.amount`: matches the test checkout total.
 - `purchases.status`: `completed`.
 - `subscriptions`: not required for one-time course access.

## 8. Admin Access

1. Create or identify an admin test user.
2. In Supabase, set:
   ```sql
   update profiles
   set role = 'admin'
   where id = '<admin-user-id>';
   ```
3. Sign in as the admin.
4. Open `/admin`.
5. Confirm Admin Dashboard loads.
6. Open `/membership`.
7. Confirm admin sees Office Pro dashboard even without a paid subscription.
8. Open `/courses` and `/templates`.
9. Confirm admin has access to premium content.

Supabase checks:
 - `profiles.role`: `admin`.
 - `subscriptions`: admin access does not require an active subscription.
 - No checkout rows should be created by admin access alone.

## 9. Template/Course Lock Behavior

Unauthenticated user:
1. Sign out.
2. Go to `/courses`.
3. Confirm premium course cards are locked.
4. Go to `/templates`.
5. Confirm premium templates are locked.

Authenticated student without subscription:
1. Sign in as a student with no active subscription and no course purchase.
2. Confirm course cards are locked.
3. Confirm premium templates are locked.
4. Attempt to open a course player URL.
5. Confirm access restricted screen appears.

Paid member:
1. Sign in as a user with `subscriptions.status = active` or `trialing`.
2. Confirm courses and templates are unlocked.

Admin:
1. Sign in as admin.
2. Confirm courses and templates are unlocked.

Supabase checks:
 - Student without subscription: no active/trialing row in `subscriptions`.
 - Paid member: active/trialing row exists in `subscriptions`.
 - Admin: `profiles.role = admin`.

## 10. Supabase Table Checks After Each Test

After signup:
```sql
select id, full_name, role, created_at
from profiles
order by created_at desc;
```

After membership checkout:
```sql
select user_id, stripe_subscription_id, stripe_customer_id, status,
       current_period_start, current_period_end, updated_at
from subscriptions
order by updated_at desc;
```

After course purchase:
```sql
select user_id, course_id, stripe_payment_intent_id, amount, status, created_at
from purchases
order by created_at desc;
```

After subscription cancellation/failure:
```sql
select user_id, stripe_subscription_id, status,
       current_period_start, current_period_end, updated_at
from subscriptions
where stripe_subscription_id = '<stripe-subscription-id>';
```

After admin setup:
```sql
select id, full_name, role
from profiles
where id = '<admin-user-id>';
```

## Ready For Launch?

- [ ] `npm run build` passes.
- [ ] Frontend env vars are set in production hosting.
- [ ] Stripe server env vars are set in production hosting.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only available server-side.
- [ ] Stripe webhook endpoint is public HTTPS.
- [ ] Stripe webhook signing secret is configured.
- [ ] Enabled Stripe events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Membership checkout creates a `subscriptions` row.
- [ ] Course checkout creates a `purchases` row.
- [ ] Subscription cancellation removes Office Pro access.
- [ ] Failed payment removes access when Stripe status is no longer `active` or `trialing`.
- [ ] Admin access works without paid subscription.
- [ ] Non-member premium templates are locked.
- [ ] Non-member premium courses are locked.
- [ ] Purchased one-time course remains accessible without Office Pro.
- [ ] No browser-side code grants membership or purchases.
- [ ] Supabase RLS policies are reviewed for premium templates and course content.
- [ ] Production Stripe products/prices are correct.
- [ ] Test users and test purchases are cleaned up before launch.
