#!/bin/bash
# Run on the EC2 host, from /opt/sevamitra (the repo checked out there).
# Usage: IMAGE_TAG=<git-sha-or-latest> ./infra/deploy.sh
set -euo pipefail

ACCOUNT_ID=104211806246
REGION=ap-south-1
ECR_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/sevamitra-backend"
IMAGE_TAG="${IMAGE_TAG:-latest}"
export ECR_IMAGE="$ECR_REPO:$IMAGE_TAG"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

./infra/render-env.sh

docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml exec -T db sh -c 'until pg_isready -U sevamitra; do sleep 1; done'
docker compose -f docker-compose.prod.yml exec -T db psql -U sevamitra -d sevamitra -c "CREATE EXTENSION IF NOT EXISTS postgis;"

docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d api

echo "Deployed $ECR_IMAGE"
