# FlowTutor AWS IaC (Terraform)

This folder provisions the MVP AWS stack for deployment:

- Amplify Hosting (Next.js App Router SSR + Route Handlers)
- S3 bucket for assets/exports
- CloudFront CDN in front of S3
- DynamoDB tables for app metadata (`projects`, `steps`, `assets`)
- Minimal IAM app user/key for server-side S3 access from Amplify runtime

## 0) Before provisioning

Prepare these first:

1. AWS account IAM permissions
   - Amplify, S3, CloudFront, IAM create/update permissions
2. Git provider token
   - GitHub token with repo access for Amplify connection
3. Secrets ready
   - `OPENAI_API_KEY`
   - `SCORM_CLOUD_APP_ID`, `SCORM_CLOUD_SECRET`, `SCORM_CLOUD_BASE_URL`
4. Cost guardrail
   - Billing alarm/budget (recommended)

## 1) Initialize variables

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with real values.

Or run one-shot provisioning script:

```bash
./iac/provision.sh
```

It auto-generates `iac/terraform.tfvars`, prompts only missing secrets, then runs `init -> plan -> apply`.

## 2) Plan and apply

```bash
terraform init
terraform plan
terraform apply
```

## 3) Outputs to use

After apply, collect:

- `amplify_default_domain`
- `assets_bucket_name`
- `assets_cdn_domain`
- `dynamodb_projects_table`
- `dynamodb_steps_table`
- `dynamodb_assets_table`
- `dynamodb_scan_runs_table`
- `dynamodb_issues_table`
- `dynamodb_score_summary_table`
- `dynamodb_scorm_regs_table`
- `app_aws_access_key_id`
- `app_aws_secret_access_key` (sensitive)

## 4) Required app code env contract

Terraform injects these envs into Amplify app:

- `STORAGE_BACKEND=s3`
- `DB_BACKEND=dynamodb`
- `APP_AWS_REGION`
- `APP_S3_BUCKET`
- `APP_S3_PREFIX`
- `APP_AWS_ACCESS_KEY_ID`
- `APP_AWS_SECRET_ACCESS_KEY`
- `DDB_PROJECTS_TABLE`
- `DDB_STEPS_TABLE`
- `DDB_ASSETS_TABLE`
- `DDB_SCAN_RUNS_TABLE`
- `DDB_ISSUES_TABLE`
- `DDB_SCORE_SUMMARY_TABLE`
- `DDB_SCORM_REG_TABLE`
- OpenAI/SCORM envs from tfvars

Your app code should read these envs and switch storage implementation from local FS to S3.

## 5) Notes

- The IAM access key is stored in Terraform state. For production hardening, move to a role-based approach or secret manager.
- For custom domain, add ACM + Route53 resources after baseline deploy.
