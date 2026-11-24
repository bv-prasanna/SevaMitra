#!/usr/bin/env bash
# Cost-controlled alternative to AWS EC2: Cloud Run + externally managed PostgreSQL.
# No user secrets are placed in this file or Git. This script deliberately cannot deploy production.
set -euo pipefail
if [[ "${APPROVE_STAGING_DEPLOY:-}" != "YES" || "${BACKUP_VERIFIED:-}" != "YES" ]]; then
  echo "Staging deployment requires APPROVE_STAGING_DEPLOY=YES and BACKUP_VERIFIED=YES" >&2
  exit 1
fi
: "${GCP_PROJECT_ID:?Specify the billing-enabled staging project}"
: "${GCP_STAGING_SERVICE_ACCOUNT:?Specify a least-privileged runtime service account email}"
: "${STAGING_WEB_ORIGIN:?Specify an HTTPS Cloudflare Pages staging origin}"
: "${RELEASE_SHA:?Specify the reviewed green commit SHA}"
if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] ||
   [[ ! "$STAGING_WEB_ORIGIN" =~ ^https://[a-zA-Z0-9.-]+$ ]]; then
  echo "Invalid RELEASE_SHA or staging web HTTPS origin" >&2
  exit 1
fi
command -v gcloud >/dev/null || { echo "Install and sign into gcloud" >&2; exit 1; }
if [[ "$(git rev-parse HEAD)" != "$RELEASE_SHA" ]]; then
  echo "Checkout the exact reviewed commit before deploying" >&2; exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo "Refusing to build uncommitted or untracked source; use the exact green commit" >&2
  exit 1
fi

REGION="${GCP_REGION:-asia-south1}"
REPO=sevamitra
SERVICE=sevamitra-api-staging
IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO}/backend:${RELEASE_SHA}"
# Require separately provisioned resources, not implicit billable creation.
gcloud artifacts repositories describe "$REPO" --location="$REGION" --project="$GCP_PROJECT_ID" >/dev/null
for secret in sevamitra-staging-db-direct sevamitra-staging-db-pooler \
  sevamitra-staging-jwt-access sevamitra-staging-jwt-refresh \
  sevamitra-staging-jwt-reset sevamitra-staging-msg91-key \
  sevamitra-staging-msg91-flow sevamitra-staging-msg91-sms-flow \
  sevamitra-staging-r2-account sevamitra-staging-r2-bucket \
  sevamitra-staging-r2-access sevamitra-staging-r2-secret \
  sevamitra-staging-cron-key; do
  gcloud secrets describe "$secret" --project="$GCP_PROJECT_ID" >/dev/null
done

# Build from backend Dockerfile, independent of hosting provider.
gcloud builds submit apps/backend --tag="$IMAGE" --region="$REGION" --project="$GCP_PROJECT_ID"

# Migration runs against the direct PostgreSQL endpoint; fail before changing API traffic.
gcloud run jobs deploy sevamitra-migrate-staging \
  --image="$IMAGE" --region="$REGION" --project="$GCP_PROJECT_ID" \
  --service-account="$GCP_STAGING_SERVICE_ACCOUNT" \
  --command="./node_modules/.bin/prisma" --args="migrate,deploy" \
  --tasks=1 --max-retries=0 --task-timeout=600s \
  --set-secrets="DATABASE_URL=sevamitra-staging-db-direct:latest"
gcloud run jobs execute sevamitra-migrate-staging \
  --region="$REGION" --project="$GCP_PROJECT_ID" --wait

# Serverless request scaling. Pay attention to free-tier usage and cold starts.
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" --region="$REGION" --project="$GCP_PROJECT_ID" \
  --service-account="$GCP_STAGING_SERVICE_ACCOUNT" --allow-unauthenticated \
  --min-instances=0 --max-instances=2 --concurrency=15 --cpu=1 --memory=1Gi --timeout=60s \
  --set-env-vars="NODE_ENV=production,ENABLE_API_DOCS=false,NOTIFICATION_PROVIDER=live,OTP_PROVIDER=msg91,PAYMENT_PROVIDER=disabled,REFUND_PROVIDER=disabled,PAYOUT_PROVIDER=disabled,PILOT_DISABLE_COLLECTIONS=true,JWT_ACCESS_TTL=15m,JWT_REFRESH_TTL=30d,JWT_RESET_TTL=10m,OTP_LENGTH=6,OTP_TTL_SECONDS=300,OTP_MAX_ATTEMPTS=5,OTP_REQUEST_COOLDOWN_SECONDS=60,CORS_ALLOWED_ORIGINS=${STAGING_WEB_ORIGIN}" \
  --set-secrets="DATABASE_URL=sevamitra-staging-db-pooler:latest,JWT_ACCESS_SECRET=sevamitra-staging-jwt-access:latest,JWT_REFRESH_SECRET=sevamitra-staging-jwt-refresh:latest,JWT_RESET_SECRET=sevamitra-staging-jwt-reset:latest,MSG91_AUTHKEY=sevamitra-staging-msg91-key:latest,MSG91_OTP_FLOW_ID=sevamitra-staging-msg91-flow:latest,MSG91_SMS_FLOW_ID=sevamitra-staging-msg91-sms-flow:latest,R2_ACCOUNT_ID=sevamitra-staging-r2-account:latest,R2_PRIVATE_BUCKET=sevamitra-staging-r2-bucket:latest,R2_ACCESS_KEY_ID=sevamitra-staging-r2-access:latest,R2_SECRET_ACCESS_KEY=sevamitra-staging-r2-secret:latest,NOTIFICATION_CRON_SECRET=sevamitra-staging-cron-key:latest"

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$GCP_PROJECT_ID" --format='value(status.url)')"
curl --fail --silent --show-error --retry 3 --retry-delay 2 "${URL}/api/health/db" >/dev/null
echo "Staging API DB health passed: ${URL}"
echo "NEXT_PUBLIC_API_BASE_URL=${URL} (web build time)"
echo "EXPO_PUBLIC_API_BASE_URL=${URL} (mobile build time)"
echo "CRON: configure Cloudflare Worker SEVAMITRA_API_ORIGIN and matching NOTIFICATION_CRON_SECRET"
echo "Staging only. Production traffic/payment approval is a separate gate."
