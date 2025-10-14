#!/bin/bash

# Retell Webhook Setup Script
# This configures your webhook URL and signing secret via the Retell API

RETELL_API_KEY="key_69b8ad2617f84c75bc1cf1e9bd67"
WEBHOOK_URL="https://ebf3009f-3b75-4547-ac53-78347e0c9df8-00-8b39meii8pth.picard.replit.dev/api/webhooks/retell"
SIGNING_SECRET="whsec_4916b1aae2f0f4215b8dd5ac86d5bb453061d1b7a5124b16058793e07d7ff4c1"

echo "🔧 Configuring Retell webhook..."

# Create/Update webhook via Retell API
curl -X POST https://api.retellai.com/v2/webhooks \
  -H "Authorization: Bearer ${RETELL_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"signing_secret\": \"${SIGNING_SECRET}\",
    \"events\": [
      \"call.started\",
      \"call.ended\",
      \"call.analyzed\"
    ]
  }"

echo ""
echo "✅ Webhook configured!"
echo ""
echo "Webhook URL: ${WEBHOOK_URL}"
echo "Secret starts with: whsec_4916..."
