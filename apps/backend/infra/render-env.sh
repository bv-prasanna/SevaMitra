#!/usr/bin/env bash
# Securely render STAGING container settings from AWS SSM Parameter Store.
# Does not print secrets. Values containing '$', '#', or newlines must be
# stored in a secret backend with suitable escaping rather than this dotenv renderer.
set -euo pipefail
umask 077

REGION="${AWS_REGION:-ap-south-1}"
PREFIX="${SSM_PREFIX:-/sevamitra/staging}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/.env"
TEMP="$(mktemp "$ROOT/.sevamitra-env.XXXXXX")"
trap 'rm -f "$TEMP"' EXIT
get_parameter() {
  aws ssm get-parameter --region "$REGION" --name "$PREFIX/$1" \
    --with-decryption --query Parameter.Value --output text
}
write_secret() {
  local key="$1" value
  value="$(get_parameter "$key")"
  if [[ -z "$value" || "$value" == *'$'* || "$value" == *'#'* ||
        "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "Unsafe or missing value for $PREFIX/$key; refusing to generate dotenv" >&2
    exit 1
  fi
  printf '%s=%s\n' "$key" "$value" >> "$TEMP"
}
{
  printf '%s\n' 'NODE_ENV=production' 'PORT=3000'
  printf '%s\n' 'JWT_ACCESS_TTL=15m' 'JWT_REFRESH_TTL=30d' 'JWT_RESET_TTL=10m'
  printf '%s\n' 'OTP_LENGTH=6' 'OTP_TTL_SECONDS=300' 'OTP_MAX_ATTEMPTS=5'
  printf '%s\n' 'OTP_REQUEST_COOLDOWN_SECONDS=60'
  printf '%s\n' 'OTP_PROVIDER=msg91' 'NOTIFICATION_PROVIDER=live'
  # Provider-first PILOT: online payments, refunds and payouts are deliberately OFF.
  printf '%s\n' 'PAYMENT_PROVIDER=disabled' 'REFUND_PROVIDER=disabled' 'PAYOUT_PROVIDER=disabled'
} > "$TEMP"
for key in POSTGRES_PASSWORD DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET JWT_RESET_SECRET \
  MSG91_AUTHKEY MSG91_OTP_FLOW_ID CORS_ALLOWED_ORIGINS R2_ACCOUNT_ID \
  R2_PRIVATE_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  write_secret "$key"
done
# Optional delivery channels. Absent keys intentionally disable that channel.
for key in MSG91_SMS_FLOW_ID WHATSAPP_ACCESS_TOKEN WHATSAPP_PHONE_NUMBER_ID \
  WHATSAPP_TEMPLATE_NAME RESEND_API_KEY RESEND_FROM_EMAIL; do
  if aws ssm get-parameter --region "$REGION" --name "$PREFIX/$key" --query Parameter.Name --output text >/dev/null 2>&1; then
    write_secret "$key"
  fi
done
mv -f "$TEMP" "$OUT"
chmod 600 "$OUT"
echo "Staging environment file rendered at $OUT (secrets redacted)"
