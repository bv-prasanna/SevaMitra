#!/usr/bin/env bash
# Manual release gate. Run on an authorized staging EC2 host with AWS CLI/Docker Compose.
# APPPROVE_STAGING_DEPLOY=YES RELEASE_SHA=<tested-commit-sha> ./infra/deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ "${APPROVE_STAGING_DEPLOY:-}" != "YES" ]]; then
  echo "Refusing deployment: set APPROVE_STAGING_DEPLOY=YES after UAT approval." >&2
  exit 1
fi
if [[ ! "${RELEASE_SHA:-}" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Refusing deployment: RELEASE_SHA must be the exact 40-character green CI commit." >&2
  exit 1
fi
REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
export ECR_IMAGE="${ECR}/sevamitra-backend:${RELEASE_SHA}"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR"
./infra/render-env.sh
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml exec -T db sh -c 'until pg_isready -U sevamitra -d sevamitra; do sleep 1; done'
# Always take a staging backup before changing the schema. Store backups off-host
# before enabling real user data: a local backup alone is not disaster recovery.
mkdir -p "$ROOT/backups"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U sevamitra -d sevamitra -Fc > "$ROOT/backups/staging-before-${RELEASE_SHA:0:12}-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d --no-deps api
for attempt in {1..30}; do
  if curl --silent --show-error --fail --max-time 4 \
    http://127.0.0.1:3000/api/health/db >/dev/null; then
    echo "Staging health check passed for $RELEASE_SHA"
    exit 0
  fi
  sleep 2
done
echo "Staging health check failed; inspect docker compose logs. Roll back application image only after schema compatibility review." >&2
exit 1
