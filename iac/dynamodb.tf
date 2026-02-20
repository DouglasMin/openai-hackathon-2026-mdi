resource "aws_dynamodb_table" "projects" {
  name         = local.projects_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "projectId"

  attribute {
    name = "projectId"
    type = "S"
  }

  attribute {
    name = "updatedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "updatedAt-index"
    hash_key        = "updatedAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "steps" {
  name         = local.steps_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "projectId"
  range_key    = "stepNo"

  attribute {
    name = "projectId"
    type = "S"
  }

  attribute {
    name = "stepNo"
    type = "N"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "assets_meta" {
  name         = local.assets_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "projectId"
  range_key    = "assetId"

  attribute {
    name = "projectId"
    type = "S"
  }

  attribute {
    name = "assetId"
    type = "S"
  }

  global_secondary_index {
    name            = "assetId-index"
    hash_key        = "assetId"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "scan_runs" {
  name         = local.scan_runs_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "projectId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "project-createdAt-index"
    hash_key        = "projectId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "issues" {
  name         = local.issues_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scanRunId"
  range_key    = "id"

  attribute {
    name = "scanRunId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "projectId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "project-createdAt-index"
    hash_key        = "projectId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "score_summary" {
  name         = local.score_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scanRunId"

  attribute {
    name = "scanRunId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "scorm_cloud_regs" {
  name         = local.scorm_regs_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "projectId"

  attribute {
    name = "projectId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}
