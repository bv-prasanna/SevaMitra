# SevaMitra: staging releases

This directory is **staging-only**. Never run the existing Docker Compose
configuration for a production financial marketplace with customer data before
managed backups, an incident response plan, TLS, gateway reconciliation and UAT.

## Prerequisites
- AWS EC2 instance with least-privilege role, Docker Compose plugin and AWS CLI.
- ECR repository `sevamitra-backend`, account access via `aws sts get-caller-identity`.
- SSM SecureStrings under `/sevamitra/staging/` for every key named in
  `render-env.sh`. Generate independent strong JWT secrets
  (`openssl rand -hex 32`), and use a URL-safe Postgres password.
- Full `DATABASE_URL` refers to the private `db:5432` Docker network,
  e.g. `postgresql://sevamitra:<encoded-password>@db:5432/sevamitra?schema=auth`.
- Private R2 bucket, MSG91 approved DLT OTP flow, and a CORS allowlist such as
  `https://staging.yourdomain.in`. Secrets must not be stored in Git or chat.
- A Cloudflare Tunnel or HTTPS reverse proxy routing `api-staging.yourdomain.in`
  to `http://127.0.0.1:3000`. The backend port is intentionally localhost-only.

## Manual release after green CI, prior to UAT
From the repository:
```bash
cd apps/backend
export AWS_REGION=ap-south-1
export RELEASE_SHA=<40-character-green-commit>
export ECR_IMAGE="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/sevamitra-backend:$RELEASE_SHA"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ECR_IMAGE%%/*}"
docker build --pull -t "$ECR_IMAGE" .
docker push "$ECR_IMAGE"
# On the staging host after checking out the same commit:
APPROVE_STAGING_DEPLOY=YES RELEASE_SHA="$RELEASE_SHA" ./infra/deploy.sh
```
The app is not public until DNS, TLS/proxy, Cloudflare Pages and EAS builds are configured.
The server runs `NODE_ENV=production` **even for staging**, so real OTP
and live notification providers are mandatory; simulated money providers
are disabled. Never set `OTP_FIXED_CODE` on this environment.

## Post deployment checks
```bash
curl --fail https://api-staging.yourdomain.in/api/health
curl --fail https://api-staging.yourdomain.in/api/health/db
```
Then test OTP registration, KYC document upload, admin approval, agent and
customer booking, provider acceptance/rejection, notifications, and IAM isolation.
Do not use an actual bank/payout workflow: this pilot intentionally disables it.

## Rollback
Pin an earlier image commit in `ECR_IMAGE`; do **not** reverse/drop DB migrations
without first restoring from a verified backup and planning for data written after
the release. Keep backups encrypted and off-host; restore-test regularly.
