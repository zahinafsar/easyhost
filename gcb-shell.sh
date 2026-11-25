#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="personal-512603"
REGION="us-central1"
BUCKET="${PROJECT_ID}-easyhost-builds"
SA_NAME="easyhost-builder"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET="registry-password"

if [ -z "${REGISTRY_PASSWORD:-}" ]; then
  echo "Set REGISTRY_PASSWORD first: export REGISTRY_PASSWORD=<password>" >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID"

gcloud services enable cloudbuild.googleapis.com secretmanager.googleapis.com storage.googleapis.com

if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --location="$REGION" --uniform-bucket-level-access
fi
echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":1}}]}' > lifecycle.json
gcloud storage buckets update "gs://${BUCKET}" --lifecycle-file=lifecycle.json
rm lifecycle.json

if ! gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --display-name="Reverhost builder"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role=roles/cloudbuild.builds.editor --condition=None
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role=roles/logging.logWriter --condition=None
gcloud iam service-accounts add-iam-policy-binding "$SA" --member="serviceAccount:${SA}" --role=roles/iam.serviceAccountUser
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member="serviceAccount:${SA}" --role=roles/storage.admin

if gcloud secrets describe "$SECRET" >/dev/null 2>&1; then
  printf '%s' "$REGISTRY_PASSWORD" | gcloud secrets versions add "$SECRET" --data-file=-
else
  printf '%s' "$REGISTRY_PASSWORD" | gcloud secrets create "$SECRET" --data-file=- --replication-policy=automatic
fi
gcloud secrets add-iam-policy-binding "$SECRET" --member="serviceAccount:${SA}" --role=roles/secretmanager.secretAccessor

gcloud iam service-accounts keys create key.json --iam-account="$SA"

echo ""
echo "Add these to the root .env (local and VPS):"
echo ""
echo "GCP_PROJECT_ID=${PROJECT_ID}"
echo "GCB_BUCKET=${BUCKET}"
echo "GCP_SERVICE_ACCOUNT_KEY=$(base64 -w0 key.json)"
echo "REGISTRY_URL=https://registry.reverhost.com"
echo "REGISTRY_PASSWORD=${REGISTRY_PASSWORD}"

rm key.json
