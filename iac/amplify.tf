resource "aws_amplify_app" "this" {
  name         = local.app_name
  repository   = var.amplify_repository_url
  access_token = var.amplify_access_token
  platform     = "WEB_COMPUTE"

  environment_variables = merge(
    local.amplify_env,
    {
      APP_AWS_ACCESS_KEY_ID     = aws_iam_access_key.app.id
      APP_AWS_SECRET_ACCESS_KEY = aws_iam_access_key.app.secret
    }
  )
}

resource "aws_amplify_branch" "main" {
  app_id            = aws_amplify_app.this.id
  branch_name       = var.amplify_branch
  stage             = upper(var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT")
  framework         = "Next.js - SSR"
  enable_auto_build = true
}
