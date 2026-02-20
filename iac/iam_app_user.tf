resource "aws_iam_user" "app" {
  name = "${local.app_name}-app-user"
}

data "aws_iam_policy_document" "app_s3_access" {
  statement {
    sid    = "AllowListBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.assets.arn
    ]
  }

  statement {
    sid    = "AllowObjectCrud"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = [
      "${aws_s3_bucket.assets.arn}/*"
    ]
  }
}

resource "aws_iam_user_policy" "app_s3_access" {
  name   = "${local.app_name}-s3-access"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app_s3_access.json
}

data "aws_iam_policy_document" "app_dynamodb_access" {
  statement {
    sid    = "AllowProjectTableCrud"
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [
      aws_dynamodb_table.projects.arn,
      aws_dynamodb_table.steps.arn,
      aws_dynamodb_table.assets_meta.arn,
      aws_dynamodb_table.scan_runs.arn,
      aws_dynamodb_table.issues.arn,
      aws_dynamodb_table.score_summary.arn,
      aws_dynamodb_table.scorm_cloud_regs.arn,
      "${aws_dynamodb_table.projects.arn}/index/*",
      "${aws_dynamodb_table.assets_meta.arn}/index/*",
      "${aws_dynamodb_table.scan_runs.arn}/index/*",
      "${aws_dynamodb_table.issues.arn}/index/*"
    ]
  }
}

resource "aws_iam_user_policy" "app_dynamodb_access" {
  name   = "${local.app_name}-dynamodb-access"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app_dynamodb_access.json
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
