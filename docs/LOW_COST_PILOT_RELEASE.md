# SevaMitra — portable near-zero-cost Dussehra pilot (October 2026)

**Goal:** a controlled provider-first demo on Vijayadashami (20 October 2026).
**Not a public paid marketplace acceptance certificate.** Latest GitHub tests may pass without a remotely provisioned environment.

## Deployment layout and portability
- **Web:** static Next.js (`apps/web/out`) on Cloudflare Pages; staging branch `develop`.
- **API:** existing NestJS Dockerfile deployed to Google Cloud Run staging. Alternative: AWS ECS/Fargate/EC2, Azure Container Apps or a VM, using the SAME image.
- **Database:** externally managed PostgreSQL (Neon pilot), with a runtime/pooler URL and separate DIRECT migration URL. PostgreSQL-specific advisory locks and schema names work on standard Postgres; test extensions and migration portability before switching providers.
- **KYC files:** private Cloudflare R2, S3-compatible; copy and verify encrypted objects during later cloud migration. Never publish the bucket.
- **Cron:** Cloudflare Workers free-tier Cron -> HMAC-authenticated backend endpoint; no idle paid API container required.
- **Mobile:** a single Expo Android preview APK with role-based menus; internal Android testing does not require app-store publishing.

The Cloud Run + Neon free tiers are quotas, **not guaranteed zero bills**. Cloud Build, image storage, Secret Manager, data egress, SMS/DLT, payment fees, backups, cloud account billing and CI can cost money. Enable cloud budget alerts and restrictive quotas. Cloud Run can scale to zero; cold starts and sleeping free-tier databases increase latency. Avoid production financial data on unverified free-tier backups.

## Required manual one-time account provisioning
1. Select a GCP staging project with billing enabled, cost budget/alerts, APIs for Cloud Run, Artifact Registry, Cloud Build and Secret Manager. Grant least privilege to the deploying operator and the runtime service account. Create an Artifact Registry Docker repository named `sevamitra` in `asia-south1`. Do not give an unauthenticated app administrative database credentials.
2. Provision Neon Postgres staging with Prisma-compatible direct and pooled URLs. Review all Prisma migrations (notably the unique gateway references), verify no duplicate legacy IDs and record an off-host encrypted backup/restore.
3. Create secrets as **separate** GCP Secret Manager entries: `sevamitra-staging-db-direct`, `sevamitra-staging-db-pooler`, `sevamitra-staging-jwt-access`, `sevamitra-staging-jwt-refresh`, `sevamitra-staging-jwt-reset`, `sevamitra-staging-msg91-key`, `sevamitra-staging-msg91-flow`, `sevamitra-staging-msg91-sms-flow`, `sevamitra-staging-r2-account`, `sevamitra-staging-r2-bucket`, `sevamitra-staging-r2-access`, `sevamitra-staging-r2-secret`, `sevamitra-staging-cron-key`. Grant the runtime and migration job identities least-privilege secret access. Cron key must be cryptographically random >=32 characters. Configure the MSG91 approved OTP and booking SMS flows and India DLT compliance. Configure a private R2 bucket for KYC uploads with least-privilege object credentials. No fixed OTP, stub money provider or console notifications on externally accessible staging.
4. Fetch the audited `develop` commit and verify CI passed. Run the script below **only after** backup verification and reviewer sign-off:
   ```bash
   export GCP_PROJECT_ID=YOUR-STAGING-PROJECT
   export GCP_STAGING_SERVICE_ACCOUNT=sevamitra-staging@YOUR-STAGING-PROJECT.iam.gserviceaccount.com
   export STAGING_WEB_ORIGIN=https://YOUR-PAGES-DOMAIN.pages.dev
   export RELEASE_SHA=$(git rev-parse HEAD)
   export APPROVE_STAGING_DEPLOY=YES BACKUP_VERIFIED=YES
   bash apps/backend/infra/gcp/deploy-staging.sh
   ```
5. Configure Cloudflare Pages from the monorepo root: build `pnpm install --frozen-lockfile && pnpm --filter @sevamitra/web build`, output `apps/web/out`, Node 22, build variable `NEXT_PUBLIC_API_BASE_URL=<Cloud Run service origin>`. The API CORS origin **must** match the deployed Pages origin. If the API URL changes, rebuild the static web.
6. Configure Cloudflare Worker Cron in `apps/backend/infra/cloudflare/notification-cron`: `npx wrangler secret put SEVAMITRA_API_ORIGIN` and `npx wrangler secret put NOTIFICATION_CRON_SECRET` (must match GCP secret); `npx wrangler deploy`. Runs every five minutes. Verify signed 200, denied unsigned 401 and retry delivery logs; clock skew >90s is rejected. Cron retries can duplicate an external provider send following a network crash; treat outbound delivery as at-least-once, not exactly-once.
7. Set `EXPO_PUBLIC_API_BASE_URL=<Cloud Run origin>` in Expo preview environment and create Android preview APK using `eas build --platform android --profile preview`. Test real Android devices separately from web browser CI.

## Pilot UAT acceptance — four real accounts
- Customer: OTP registration, secure trusted-device relogin, location consent, discovery, booking, same-UUID retry, cancellation.
- Provider: KYC to R2, admin approval, offering/availability, accept/reject, status transitions and notification.
- Agent: own referral denied; valid separate provider referral and applicant approval, no admin privilege leakage.
- Admin: role matrix read/write restrictions, provider review, visibility of runtime flags and disable new bookings for a pilot geography.
- Ops: backup and restore, negative JWT/device tests, duplicate booking cross-device DB race, privacy / location access, retry scheduler failure and dead-letter review, API outage/recovery, KYC controls, private R2 read.
- Payment **disabled**, no live refunds/payouts, and no representations of escrow until reconciled webhooks, refunds, payout identity and statutory review are complete.

## Post-pilot cloud migration: AWS or Azure
1. Build/tag the same Docker image and deploy to ECS/Fargate/EC2 or Azure Container Apps, using environment-managed secrets. Keep health endpoints and service DNS constant.
2. Snapshot database, pause writes and notification cron, restore to RDS PostgreSQL/Azure PostgreSQL, run migrations and validate checksums/row counts, then point `DATABASE_URL` to the new endpoint. Preserve audit/financial history.
3. Transfer R2 evidence to an encrypted S3 or Azure Blob private bucket; update storage adapter configuration or keep R2 temporarily. Portability of the storage API does not automatically migrate files.
4. Update DNS, web and mobile API bases, CORS, OTP/payment webhooks and worker origin. Ship mobile builds if a hardcoded API origin changes. Test rollback using a backup and compatible migration.
5. Validate load, limits, IAM, region/data-location expectations, costs and a complete end-to-end UAT before unpausing writes.

**Remaining P0 issues** are tracked in #3 (webhooks/refunds/reconciliation), #4 (disputes/reverification), #5 (offline roles) and #6 (privacy/liability/fraud and operational controls). This staging PR addresses deployability and the notification scheduler, **not** those incomplete application workflows.
