variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project/service name prefix."
  type        = string
  default     = "flowtutor"
}

variable "environment" {
  description = "Environment name (dev/staging/prod)."
  type        = string
  default     = "prod"
}

variable "aws_account_id" {
  description = "Fixed AWS account id used for deterministic naming."
  type        = string
  default     = "863518440691"
}

variable "amplify_repository_url" {
  description = "Git repository URL to connect in Amplify (e.g. https://github.com/org/repo)."
  type        = string
}

variable "amplify_access_token" {
  description = "Git provider access token for initial Amplify app connection."
  type        = string
  sensitive   = true
}

variable "amplify_branch" {
  description = "Default branch to deploy."
  type        = string
  default     = "main"
}

variable "asset_bucket_name" {
  description = "Optional explicit S3 bucket name. If empty, one is derived."
  type        = string
  default     = ""
}

variable "s3_key_prefix" {
  description = "Prefix folder inside S3 bucket for uploaded assets/exports."
  type        = string
  default     = "prod"
}

variable "openai_model" {
  description = "Default OpenAI model name injected into Amplify env."
  type        = string
  default     = "gpt-4.1"
}

variable "openai_tts_model" {
  description = "Default OpenAI TTS model."
  type        = string
  default     = "gpt-4o-mini-tts"
}

variable "openai_tts_voice" {
  description = "Default OpenAI TTS voice."
  type        = string
  default     = "alloy"
}

variable "enable_tts" {
  description = "Whether TTS is enabled in application env."
  type        = bool
  default     = true
}

variable "openai_api_key" {
  description = "OpenAI API key injected to Amplify env."
  type        = string
  sensitive   = true
  default     = ""
}

variable "scorm_cloud_app_id" {
  description = "SCORM Cloud app id injected to Amplify env."
  type        = string
  sensitive   = true
  default     = ""
}

variable "scorm_cloud_secret" {
  description = "SCORM Cloud secret injected to Amplify env."
  type        = string
  sensitive   = true
  default     = ""
}

variable "scorm_cloud_base_url" {
  description = "SCORM Cloud API base URL."
  type        = string
  default     = "https://cloud.scorm.com/api/v2/"
}
