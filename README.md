# ClientFlow

## Setup
1. `cp .env.example .env.local`, fill Supabase / Razorpay / Resend values.
2. `npm install`
3. `npm run db:generate && npm run db:migrate`, then apply `drizzle/migrations/0001_rls.sql`.
4. `npm run dev` · `npm run typecheck` · `npm test`

## Status
- [x] Drizzle schema (core tables), RLS policies, tenant helper, RBAC
- [x] Bigint money, invoice totals/status, idempotent verified Razorpay webhook, unit tests
- [ ] Phase 1: shell, design system, landing, auth
- [ ] Phase 3: dashboard, CRM, projects/tasks
- [ ] Phase 4: proposals, invoice UI, PDF
- [ ] Phase 5: checkout/payment links, client portal, notifications
- [ ] Phase 6: automations, reports, settings
- [ ] Phase 7: e2e, hardening, deploy
- [ ] Remaining schema: proposals, roles/permissions tables, invitations, subscriptions, notifications, automations, integrations, api_keys, milestones, comments, attachments
