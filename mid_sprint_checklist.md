# Mid-Sprint Checkpoint Checklist

Use this checklist to validate current progress before moving to AWS migration and final demo prep.

---

## 0) Pre-flight

- [ ] Run `npm run lint` (must pass)
- [ ] Run `npm run build` (must pass)
- [ ] Ensure `.env` has valid `OPENAI_API_KEY` for reliability scan
- [ ] Ensure at least one project has:
  - [ ] screenshot assets
  - [ ] an exported zip asset (`Export SCORM`)

---

## 1) End-to-End QA Flow (UI)

Target page: `/projects/{projectId}/qa`

### A. Initial Scan
- [ ] Click `Run Scan`
- [ ] Scan completes without 500 error
- [ ] Score cards appear:
  - [ ] Total
  - [ ] Accessibility
  - [ ] SCORM
  - [ ] Reliability
- [ ] Top Issues list shows entries (or explicit no-issues state)

### B. Filtering/Traceability
- [ ] `Run` dropdown changes results for selected scan run
- [ ] Category filter works (`accessibility/scorm/reliability`)
- [ ] Severity filter works (`critical/high/medium/low`)
- [ ] Search query (`q`) filters by title/rule/detail

### C. Auto Fix + Re-scan
- [ ] Click `Auto Fix`
- [ ] `Fix Artifacts` section shows:
  - [ ] changed files count
  - [ ] fix counters (alt/aria/heading)
  - [ ] `Download Fixed ZIP` works
  - [ ] `Download Diff` works
- [ ] Click `Re-scan`
- [ ] New scan run is created
- [ ] `Before / After` section displays score deltas

### D. VPAT Draft
- [ ] Click `Generate VPAT`
- [ ] VPAT draft file appears in UI
- [ ] `Download VPAT Draft` works
- [ ] Open file and confirm it includes:
  - [ ] Product information
  - [ ] Score snapshot
  - [ ] Accessibility issue counts
  - [ ] Conformance summary table

---

## 2) API Contract Checks (Manual)

Replace `{id}` with real `projectId`.

- [ ] `GET /api/projects/{id}/scan`
  - [ ] returns `scanRun`, `issues`, `score`, `scoreMeta`
- [ ] `POST /api/projects/{id}/scan`
  - [ ] returns `ok: true` and stores new run
- [ ] `POST /api/projects/{id}/rescan`
  - [ ] returns `ok: true` and another new run
- [ ] `GET /api/projects/{id}/scan-runs`
  - [ ] returns run list with `score` per run
- [ ] `GET /api/projects/{id}/issues?category=accessibility&severity=high&limit=10`
  - [ ] returns filtered results + `total`
- [ ] `POST /api/projects/{id}/fix`
  - [ ] returns zip/diff download URLs
- [ ] `POST /api/projects/{id}/vpat`
  - [ ] returns VPAT download URL

---

## 3) DB Integrity Checks (SQLite)

Open DB:
```bash
cd /Users/douggy/per-projects/hackathon2026
sqlite3 data/flowtutor.db
```

### Required tables
- [ ] `.tables` includes:
  - [ ] `scan_runs`
  - [ ] `issues`
  - [ ] `score_summary`

### Basic row checks
- [ ] Latest runs:
```sql
SELECT id, project_id, status, created_at FROM scan_runs ORDER BY created_at DESC LIMIT 5;
```
- [ ] Latest issue counts by run:
```sql
SELECT scan_run_id, category, severity, COUNT(*) FROM issues GROUP BY scan_run_id, category, severity ORDER BY scan_run_id DESC;
```
- [ ] Score summaries:
```sql
SELECT scan_run_id, total_score, accessibility_score, scorm_score, reliability_score FROM score_summary ORDER BY updated_at DESC LIMIT 5;
```

Expected:
- [ ] Each completed run has issue rows (possibly 0) and one score summary row
- [ ] Re-scan creates a new `scan_runs` row (does not overwrite previous run)

---

## 4) Failure/Edge Case Checks

### A. No OPENAI_API_KEY
- [ ] Reliability scan degrades gracefully (no crash)
- [ ] Issue/log indicates reliability scan skipped/failure cleanly

### B. No zip asset
- [ ] Scan returns SCORM package missing issue (not hard crash)
- [ ] UI still loads results

### C. Zip with no HTML
- [ ] Accessibility scanner reports no HTML to scan
- [ ] API returns structured response, not unhandled exception

### D. Broken/invalid artifact download
- [ ] Invalid `file` query for `/fix` or `/vpat` returns 4xx with readable error

---

## 5) Demo Readiness Gate

Pass only if all are true:
- [ ] QA flow works end-to-end in < 2 minutes
- [ ] At least one run shows meaningful issues and non-trivial score
- [ ] Auto Fix produces downloadable zip + diff
- [ ] Re-scan shows visible score delta
- [ ] VPAT draft downloads and reads cleanly
- [ ] No blocking build/lint/type errors

---

## 6) If Something Fails

Record in this format:
- Step:
- Expected:
- Actual:
- API response/body:
- Console/server logs:
- Repro steps:

Then fix in priority order:
1. End-to-end blockers (`Run Scan`, `Re-scan`, downloads)
2. Data integrity bugs (`scan_runs/issues/score_summary`)
3. UX polish and performance
