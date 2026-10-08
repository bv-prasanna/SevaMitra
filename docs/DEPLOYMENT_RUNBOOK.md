# SevaMitra Deployment Runbook — Provider-first Dussehra pilot
Status: PREPARATION / NOT DEPLOYED. Owner approval + UAT required.
Target architecture: GitHub CI → staging backend on AWS EC2 Docker →
Cloudflare Tunnel + DNS → Cloudflare Pages static Next.js web →
Expo EAS Android APK and iOS internal build. Production is a separate release.

## 1. Deploy gates
1. GitHub develop commit is green: API build, Prisma schema/migrations on Postgres,
   backend tests and global coverage floors, frontend/mobile typechecks, static web export.
2. All secrets in AWS SSM/EAS/Cloudflare project settings, never committed or pasted to chat.
3. Staging backend starts using `NODE_ENV=production` with approved MSG91 OTP flow,
   live notifications, private R2 uploads and exact HTTPS CORS allowlist.
4. Staging booking and identity journey exercised with four distinct user roles.
5. Finance and compliance sign-off before money movement; production has no mock gateway.
6. Written sign-off before production cutover.

## 2. Backend staging — AWS EC2 + Docker Compose
The repository provides `apps/backend/Dockerfile`,
`apps/backend/docker-compose.prod.yml`, and `apps/backend/infra/deploy.sh`.
For staging, self-hosted Postgres is acceptable for synthetic/test data ONLY.
For real customer/financial data, migrate to managed PostgreSQL, set automatic
encrypted backups, retention, replication, monitoring and restore drills.

Provision AWS EC2 with a narrow IAM role allowed to read only
`/sevamitra/staging/*` SSM SecureStrings and pull the relevant ECR image.
Allow SSH only via SSM Session Manager. No public 5432 or 3000 access.
Install Docker Engine with Compose plugin, AWS CLI and curl.

Create SSM SecureStrings for:
`POSTGRES_PASSWORD`, `DATABASE_URL` (private Docker-network URL),
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET`,
`MSG91_AUTHKEY`, `MSG91_OTP_FLOW_ID`, `CORS_ALLOWED_ORIGINS`,
`R2_ACCOUNT_ID`, `R2_PRIVATE_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`.

Additional delivery keys can be configured for
`MSG91_SMS_FLOW_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
Do not assume WhatsApp templates work without prior provider/template approval.
`CORS_ALLOWED_ORIGINS` should be an exact origin:
`https://staging.YOUR-DOMAIN` (no path, no wildcard).

Use high-entropy independent 32+ byte secrets and a URL-safe DB password.
The supplied dotenv renderer rejects dollar signs, # and multiline values.
Set `AWS_REGION=ap-south-1`, `SSM_PREFIX=/sevamitra/staging`.
Do not use your live money keys or test with real customer records.

Build and push the exact green CI commit:
```bash
git checkout <GREEN_COMMIT_SHA>
cd apps/backend
export AWS_REGION=ap-south-1
export RELEASE_SHA=$(git rev-parse HEAD)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/sevamitra-backend:$RELEASE_SHA"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
docker build --pull -t "$ECR_IMAGE" .
docker push "$ECR_IMAGE"
```
On the staging host, checkout the exact same commit and (after review) run:
```bash
cd apps/backend
AWS_REGION=ap-south-1 SSM_PREFIX=/sevamitra/staging \
  APPROVE_STAGING_DEPLOY=YES RELEASE_SHA=<GREEN_COMMIT_SHA> ./infra/deploy.sh
```
The script renders environment from SSM, backs up the staging DB, applies
Prisma migrations, starts the API and checks
`http://127.0.0.1:3000/api/health/db`.
Backups must be copied encrypted off-host for actual recovery.

### TLS / publicly reachable API
Run Cloudflare Tunnel on the EC2 host, with an authenticated Cloudflare
account and DNS zone. Route `api-staging.YOUR-DOMAIN` to
`http://localhost:3000`. Keep Docker listening on loopback only.
Cloudflare Tunnel official setup and Access rules should be used.
Do not make an unauthenticated admin endpoint or Swagger public.
Validate:
```bash
curl -i https://api-staging.YOUR-DOMAIN/api/health
curl -i https://api-staging.YOUR-DOMAIN/api/health/db
```
Expected HTTP 200 and healthy response; do not ignore failed DB health.

## 3. Web staging — Cloudflare Pages
Web is a static Next.js export with client-side API requests.
In Cloudflare > Workers & Pages > Create Pages project > Git:
- Connect `bv-prasanna/SevaMitra`; use branch `develop` for staging.
- Set working directory / repo root (to allow pnpm workspace resolution).
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @sevamitra/web build`
- Output directory: `apps/web/out`
- Node version: 22
- Build environment variable: `NEXT_PUBLIC_API_BASE_URL=https://api-staging.YOUR-DOMAIN`
  (**origin only**; ApiClient automatically appends `/api/v1`).
- Assign HTTPS staging custom domain `staging.YOUR-DOMAIN`.
- Match this exact origin in SSM `CORS_ALLOWED_ORIGINS` and redeploy backend
  when its CORS allowlist changes.

Verify `/login`, `/provider`, `/agent`, `/customer`,
`/admin`, `/admin/organizations`, `/marketplace`
and `/marketplace/discover?serviceId=<VALID_ID>`.
The static export is for this CLIENT-RENDERED app; if SSR routes are added,
revisit Cloudflare Workers (OpenNext/vinext) before deployment.

## 4. Mobile staging — Expo EAS
Use a connected Expo/EAS project and the intended bundle identifiers
in `apps/mobile/app.json`; never change them after store release without a
migration plan. Set `EXPO_PUBLIC_API_BASE_URL` in Expo's `preview` and
`production` environments to the matching API HTTPS **origin**.
It is a public URL, not a secret. Never place JWT, SMS, Razorpay or R2
secret keys into an `EXPO_PUBLIC_` variable.

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```
Android preview creates a shareable APK for functional testing. iOS internal
device distribution needs Apple credentials and registered devices.
After testing, configure live endpoints and submit release builds:
```bash
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform android --profile production
npx eas-cli submit --platform ios --profile production
```
Google Play and Apple app review timelines are outside this repository and
cannot be guaranteed before a festival launch.

## 5. Required UAT matrix (four roles, web + mobile)
- Registration, OTP, login, refresh, logout, suspended-account block;
- Admin/agent/provider/customer role-isolation and unauthorized request denial;
- Agent onboarding/referral and provider application, private KYC upload/review;
- Admin approval/rejection and approval notification;
- Provider services/prices/coverage/hours;
- Customer service location, matching and booking;
- Provider accept/reject and customer's completion/cancellation;
- Two simultaneous bookings for identical provider/time must not double-book;
- Notifications where credentials/templates are provisioned;
- KYC storage privacy and missing-provider graceful fallback;
- Android real-device keyboard, navigation, permission and network tests;
- Financial records: NO fake online payments or automated payouts in pilot;
- Backups/restores, basic monitoring, uptime and error-reporting.

## 6. Production go/no-go
Staging passing is necessary, not sufficient. Public production with real money
requires: payment verification and signed webhooks with replay protection,
refund-to-original-payment integration, KYC-backed payout accounts and
reconciliation, tax treatment/invoices/ledger review by adviser, legal policy
publication, grievance process, verified backup restore, monitoring and alerting,
threat-model/security review, rate limits, store approvals and signed UAT.

Use separate production DB/bucket/keys/domains; never reuse staging secrets.
No automatic deployment from a green test alone.
