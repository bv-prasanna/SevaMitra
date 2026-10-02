#!/bin/bash
# Run on the EC2 host (has the sevamitra-staging-ec2-role instance profile,
# which grants SSM read access to /sevamitra/staging/*). Renders .env for
# docker-compose.prod.yml from Parameter Store — secrets never live in the
# repo or in shell history.
set -euo pipefail

REGION=ap-south-1
PREFIX=/sevamitra/staging

get() {
  aws ssm get-parameter --region "$REGION" --name "$PREFIX/$1" \
    --with-decryption --query Parameter.Value --output text
}

POSTGRES_PASSWORD=$(get POSTGRES_PASSWORD)
JWT_ACCESS_SECRET=$(get JWT_ACCESS_SECRET)
JWT_REFRESH_SECRET=$(get JWT_REFRESH_SECRET)
JWT_RESET_SECRET=$(get JWT_RESET_SECRET)

cat > .env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://sevamitra:${POSTGRES_PASSWORD}@db:5432/sevamitra?schema=auth
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_TTL=30d
JWT_RESET_SECRET=${JWT_RESET_SECRET}
JWT_RESET_TTL=10m
OTP_LENGTH=6
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_REQUEST_COOLDOWN_SECONDS=60
NOTIFICATION_PROVIDER=console
EOF

chmod 600 .env
echo "Wrote .env"
