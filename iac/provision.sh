#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
TFVARS_FILE="$SCRIPT_DIR/terraform.tfvars"

PROFILE="${AWS_PROFILE:-dongik2}"
REGION="${AWS_REGION:-ap-northeast-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-863518440691}"
PROJECT_NAME="${PROJECT_NAME:-flowtutor}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-prod}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"
S3_KEY_PREFIX="${S3_KEY_PREFIX:-prod}"

read_env_key() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2- || true
  fi
}

escape_tf_string() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf "%s" "$value"
}

prompt_if_empty() {
  local var_name="$1"
  local prompt_text="$2"
  local secret="${3:-false}"
  local current="${!var_name:-}"
  if [[ -n "$current" ]]; then
    return
  fi
  if [[ "$secret" == "true" ]]; then
    read -r -s -p "$prompt_text: " current
    echo
  else
    read -r -p "$prompt_text: " current
  fi
  printf -v "$var_name" "%s" "$current"
}

detect_repo_url() {
  local remote
  remote="$(git -C "$ROOT_DIR" config --get remote.origin.url || true)"
  if [[ -z "$remote" ]]; then
    echo ""
    return
  fi
  if [[ "$remote" =~ ^git@github.com:(.+)\.git$ ]]; then
    echo "https://github.com/${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$remote" =~ ^https://github.com/(.+)\.git$ ]]; then
    echo "https://github.com/${BASH_REMATCH[1]}"
    return
  fi
  echo "$remote"
}

OPENAI_API_KEY="${OPENAI_API_KEY:-$(read_env_key OPENAI_API_KEY)}"
SCORM_CLOUD_APP_ID="${SCORM_CLOUD_APP_ID:-$(read_env_key SCORM_CLOUD_APP_ID)}"
SCORM_CLOUD_SECRET="${SCORM_CLOUD_SECRET:-$(read_env_key SCORM_CLOUD_SECRET)}"
SCORM_CLOUD_BASE_URL="${SCORM_CLOUD_BASE_URL:-$(read_env_key SCORM_CLOUD_BASE_URL)}"
if [[ -z "${SCORM_CLOUD_BASE_URL:-}" ]]; then
  SCORM_CLOUD_BASE_URL="https://cloud.scorm.com/api/v2/"
fi

OPENAI_MODEL="${OPENAI_MODEL:-$(read_env_key OPENAI_MODEL)}"
if [[ -z "${OPENAI_MODEL:-}" ]]; then
  OPENAI_MODEL="gpt-4.1"
fi

ENABLE_TTS="${ENABLE_TTS:-$(read_env_key ENABLE_TTS)}"
if [[ -z "${ENABLE_TTS:-}" ]]; then
  ENABLE_TTS="true"
fi

OPENAI_TTS_MODEL="${OPENAI_TTS_MODEL:-$(read_env_key OPENAI_TTS_MODEL)}"
if [[ -z "${OPENAI_TTS_MODEL:-}" ]]; then
  OPENAI_TTS_MODEL="gpt-4o-mini-tts"
fi

OPENAI_TTS_VOICE="${OPENAI_TTS_VOICE:-$(read_env_key OPENAI_TTS_VOICE)}"
if [[ -z "${OPENAI_TTS_VOICE:-}" ]]; then
  OPENAI_TTS_VOICE="alloy"
fi

AMPLIFY_REPOSITORY_URL="${AMPLIFY_REPOSITORY_URL:-$(detect_repo_url)}"
AMPLIFY_ACCESS_TOKEN="${AMPLIFY_ACCESS_TOKEN:-}"

prompt_if_empty AMPLIFY_REPOSITORY_URL "Amplify repository URL (https://github.com/org/repo)"
prompt_if_empty AMPLIFY_ACCESS_TOKEN "Amplify Git access token" true
prompt_if_empty OPENAI_API_KEY "OPENAI_API_KEY" true
prompt_if_empty SCORM_CLOUD_APP_ID "SCORM_CLOUD_APP_ID"
prompt_if_empty SCORM_CLOUD_SECRET "SCORM_CLOUD_SECRET" true

cat >"$TFVARS_FILE" <<EOF
aws_region             = "$(escape_tf_string "$REGION")"
aws_account_id         = "$(escape_tf_string "$ACCOUNT_ID")"
project_name           = "$(escape_tf_string "$PROJECT_NAME")"
environment            = "$(escape_tf_string "$ENVIRONMENT_NAME")"
amplify_repository_url = "$(escape_tf_string "$AMPLIFY_REPOSITORY_URL")"
amplify_access_token   = "$(escape_tf_string "$AMPLIFY_ACCESS_TOKEN")"
amplify_branch         = "$(escape_tf_string "$AMPLIFY_BRANCH")"
asset_bucket_name      = ""
s3_key_prefix          = "$(escape_tf_string "$S3_KEY_PREFIX")"
openai_api_key         = "$(escape_tf_string "$OPENAI_API_KEY")"
openai_model           = "$(escape_tf_string "$OPENAI_MODEL")"
enable_tts             = ${ENABLE_TTS}
openai_tts_model       = "$(escape_tf_string "$OPENAI_TTS_MODEL")"
openai_tts_voice       = "$(escape_tf_string "$OPENAI_TTS_VOICE")"
scorm_cloud_app_id     = "$(escape_tf_string "$SCORM_CLOUD_APP_ID")"
scorm_cloud_secret     = "$(escape_tf_string "$SCORM_CLOUD_SECRET")"
scorm_cloud_base_url   = "$(escape_tf_string "$SCORM_CLOUD_BASE_URL")"
EOF

echo "Generated: $TFVARS_FILE"
echo "Running Terraform with AWS_PROFILE=$PROFILE AWS_REGION=$REGION"

AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" terraform -chdir="$SCRIPT_DIR" init
AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" terraform -chdir="$SCRIPT_DIR" plan -out=tfplan
AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" terraform -chdir="$SCRIPT_DIR" apply tfplan
AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" terraform -chdir="$SCRIPT_DIR" output
