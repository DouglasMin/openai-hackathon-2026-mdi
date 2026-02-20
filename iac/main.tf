locals {
  default_bucket_name = lower("${var.project_name}-${var.environment}-${var.aws_account_id}-assets")
  asset_bucket_name   = var.asset_bucket_name != "" ? var.asset_bucket_name : local.default_bucket_name

  app_name              = "${var.project_name}-${var.environment}"
  projects_table_name   = "${local.app_name}-projects"
  steps_table_name      = "${local.app_name}-steps"
  assets_table_name     = "${local.app_name}-assets-meta"
  scan_runs_table_name  = "${local.app_name}-scan-runs"
  issues_table_name     = "${local.app_name}-issues"
  score_table_name      = "${local.app_name}-score-summary"
  scorm_regs_table_name = "${local.app_name}-scorm-cloud-registrations"

  optional_app_env = merge(
    var.openai_api_key != "" ? { OPENAI_API_KEY = var.openai_api_key } : {},
    var.scorm_cloud_app_id != "" ? { SCORM_CLOUD_APP_ID = var.scorm_cloud_app_id } : {},
    var.scorm_cloud_secret != "" ? { SCORM_CLOUD_SECRET = var.scorm_cloud_secret } : {}
  )

  required_app_env = {
    OPENAI_MODEL            = var.openai_model
    ENABLE_TTS              = var.enable_tts ? "true" : "false"
    OPENAI_TTS_MODEL        = var.openai_tts_model
    OPENAI_TTS_VOICE        = var.openai_tts_voice
    SCORM_CLOUD_BASE_URL    = var.scorm_cloud_base_url
    STORAGE_BACKEND         = "s3"
    APP_AWS_REGION          = var.aws_region
    APP_S3_BUCKET           = local.asset_bucket_name
    APP_S3_PREFIX           = var.s3_key_prefix
    DB_BACKEND              = "dynamodb"
    DDB_PROJECTS_TABLE      = local.projects_table_name
    DDB_STEPS_TABLE         = local.steps_table_name
    DDB_ASSETS_TABLE        = local.assets_table_name
    DDB_SCAN_RUNS_TABLE     = local.scan_runs_table_name
    DDB_ISSUES_TABLE        = local.issues_table_name
    DDB_SCORE_SUMMARY_TABLE = local.score_table_name
    DDB_SCORM_REG_TABLE     = local.scorm_regs_table_name
    NODE_ENV                = "production"
  }

  amplify_env = merge(local.required_app_env, local.optional_app_env)
}
