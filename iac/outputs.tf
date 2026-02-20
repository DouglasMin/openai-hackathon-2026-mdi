output "amplify_app_id" {
  description = "Amplify app id."
  value       = aws_amplify_app.this.id
}

output "amplify_default_domain" {
  description = "Amplify default domain."
  value       = aws_amplify_app.this.default_domain
}

output "amplify_branch_name" {
  description = "Amplify branch deployed by Terraform."
  value       = aws_amplify_branch.main.branch_name
}

output "assets_bucket_name" {
  description = "S3 bucket name for FlowTutor assets/exports."
  value       = aws_s3_bucket.assets.bucket
}

output "assets_cdn_domain" {
  description = "CloudFront domain for S3 asset distribution."
  value       = aws_cloudfront_distribution.assets.domain_name
}

output "dynamodb_projects_table" {
  description = "DynamoDB table name for projects metadata."
  value       = aws_dynamodb_table.projects.name
}

output "dynamodb_steps_table" {
  description = "DynamoDB table name for steps."
  value       = aws_dynamodb_table.steps.name
}

output "dynamodb_assets_table" {
  description = "DynamoDB table name for assets metadata."
  value       = aws_dynamodb_table.assets_meta.name
}

output "dynamodb_scan_runs_table" {
  description = "DynamoDB table name for scan runs."
  value       = aws_dynamodb_table.scan_runs.name
}

output "dynamodb_issues_table" {
  description = "DynamoDB table name for issues."
  value       = aws_dynamodb_table.issues.name
}

output "dynamodb_score_summary_table" {
  description = "DynamoDB table name for score summary."
  value       = aws_dynamodb_table.score_summary.name
}

output "dynamodb_scorm_regs_table" {
  description = "DynamoDB table name for SCORM Cloud registrations."
  value       = aws_dynamodb_table.scorm_cloud_regs.name
}

output "app_aws_access_key_id" {
  description = "Access key id for the app user."
  value       = aws_iam_access_key.app.id
}

output "app_aws_secret_access_key" {
  description = "Secret access key for the app user."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}
