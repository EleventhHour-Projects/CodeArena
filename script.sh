#!/bin/bash

# Deployment script for Go Webhook Deployment Server
# This script triggers a deployment and polls for completion.

if [ -z "$DEPLOY_URL" ]; then
  echo "Error: DEPLOY_URL is not set."
  exit 1
fi

if [ -z "$DEPLOY_TOKEN" ]; then
  echo "Error: DEPLOY_TOKEN is not set."
  exit 1
fi

echo "Triggering deployment at $DEPLOY_URL..."

# Trigger the deployment
curl -X POST "$DEPLOY_URL/deploy" \
     -H "X-Deploy-Token: $DEPLOY_TOKEN" \
     -s -f

if [ $? -ne 0 ]; then
  echo "Error: Failed to trigger deployment."
  exit 1
fi

echo "Waiting for deployment to complete..."

while true; do
  STATUS_JSON=$(curl -s -H "X-Deploy-Token: $DEPLOY_TOKEN" "$DEPLOY_URL/deployment-status")
  STATUS=$(echo $STATUS_JSON | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  
  if [ "$STATUS" == "success" ]; then
    echo "Deployment successful!"
    exit 0
  elif [ "$STATUS" == "failure" ]; then
    ERROR=$(echo $STATUS_JSON | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    echo "Deployment failed: $ERROR"
    exit 1
  elif [ "$STATUS" == "in_progress" ]; then
    echo "..."
  else
    echo "Unknown status: $STATUS"
    echo "Response: $STATUS_JSON"
  fi
  
  sleep 5
done