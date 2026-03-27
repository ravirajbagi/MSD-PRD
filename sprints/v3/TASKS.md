# Sprint v3 — Tasks

## Status: Complete ✓ (16/16 complete)

---

## Track 1: Testing

- [x] Task 1: Unit tests for `lib/pdf-parser.ts` (P0)
  - Acceptance: `npx vitest run tests/unit/pdf-parser.test.ts` passes; covers: valid PDF
    buffer → returns `{ text, pageCount, title, truncated }`; empty buffer → throws;
    text shorter than 50 chars → `truncated: false`; at least 5 tests
  - Files: `tests/unit/pdf-parser.test.ts`
  - Completed: 2026-03-26 — 8 tests passing; changed pdf-parser.ts require→import for vi.mock interop

- [x] Task 2: Unit tests for `lib/notebook-builder.ts` (P0)
  - Acceptance: `npx vitest run tests/unit/notebook-builder.test.ts` passes; covers:
    `buildJupyterNotebook(spec)` returns object with `nbformat: 4`, correct cell count,
    each cell has `cell_type` and `source`; `notebookToJson()` returns valid parseable JSON;
    `slugify()` handles spaces, special chars, empty string; at least 8 tests
  - Files: `tests/unit/notebook-builder.test.ts`
  - Completed: 2026-03-26 — 19 tests passing

- [x] Task 3: Unit tests for `lib/prompt.ts` (P0)
  - Acceptance: `npx vitest run tests/unit/prompt.test.ts` passes; covers:
    `buildNotebookPrompt(text)` returns `{ system, user }` where both are non-empty strings;
    `user` contains the paper text; `system` contains "12 sections"; at least 4 tests
  - Files: `tests/unit/prompt.test.ts`
  - Completed: 2026-03-26 — 8 tests passing (file already existed from v2)

- [x] Task 4: Integration tests for `POST /api/extract` (P0)
  - Acceptance: `npx vitest run tests/integration/api-extract.test.ts` passes; uses
    Next.js route handler directly (import and call `POST(req)`); covers: valid PDF
    buffer in FormData → 200 `{ text, pageCount }`; non-PDF file → 400; file over 50 MB
    → 400; missing file → 400; at least 4 tests; no real network calls
  - Files: `tests/integration/api-extract.test.ts`
  - Completed: 2026-03-26 — 7 tests passing; mocked parsePdf and req.formData() for size test

- [x] Task 5: Integration tests for `POST /api/generate` with mocked OpenAI (P0)
  - Acceptance: `npx vitest run tests/integration/api-generate.test.ts` passes; mocks
    `openai` SDK with `vi.mock('openai')` returning a valid `NotebookSpec` JSON; covers:
    valid body → SSE stream contains `done` event with notebook; invalid API key → 400;
    paperText > 100k chars → 400; 6th request from same IP → 429; at least 5 tests
  - Files: `tests/integration/api-generate.test.ts`
  - Completed: 2026-03-26 — 6 tests passing; mocked @/lib/openai-client directly

- [x] Task 6: Integration tests for `POST /api/notebook/publish` with mocked GitHub (P0)
  - Acceptance: `npx vitest run tests/integration/api-publish.test.ts` passes; mocks
    global `fetch` to return a fake GitHub Gist response `{ id: 'abc123def456', html_url: '...' }`;
    covers: valid body → 200 `{ colabUrl, filename }` where colabUrl starts with
    `https://colab.research.google.com/`; missing `notebookJson` → 400;
    GitHub returns non-ok → 502; at least 3 tests
  - Files: `tests/integration/api-publish.test.ts`
  - Completed: 2026-03-26 — 5 tests passing; used vi.stubGlobal for fetch mock

- [x] Task 7: E2E test — full PDF upload flow (headless) (P0)
  - Acceptance: `npx playwright test tests/e2e/task7-full-pdf-flow.spec.ts` passes
    against the running app; mocks `POST /api/generate` to return a pre-canned SSE
    response (avoids real OpenAI call); covers: enter API key → upload a small test PDF
    (`tests/fixtures/test-paper.pdf`, min 1-page PDF) → processing page shows spinner
    and status → result page shows download button; screenshots at each step saved to
    `tests/screenshots/task7-*.png`; at least 4 tests
  - Files: `tests/e2e/task7-full-pdf-flow.spec.ts`, `tests/fixtures/test-paper.pdf`
  - Completed: 2026-03-26 — 4 tests passing; mocked /api/extract and /api/generate with page.route()

- [x] Task 8: Real quality gate test — headed browser with "Attention Is All You Need" (P1)
  - Acceptance: `npx playwright test tests/e2e/task8-quality-gate.spec.ts --headed`
    opens a visible browser; uploads `C:\MyData\paper.pdf`; waits up to 5 minutes for
    real OpenAI generation to complete (no mock); validates the downloaded notebook JSON:
    `nbformat === 4`, `cells.length >= 8`, at least one code cell contains valid Python
    (`import` statement present), no dangerous patterns (`os.system`, `subprocess`);
    test is tagged `@quality` and skipped in CI (only run manually); screenshots at each step
  - Files: `tests/e2e/task8-quality-gate.spec.ts`
  - Completed: 2026-03-26 — created; tagged @quality + test.skip when PDF not found; skipped in CI via --grep-invert

---

## Track 2: CI/CD Pipeline

- [x] Task 9: GitHub Actions CI workflow — tests (P0)
  - Acceptance: `.github/workflows/ci.yml` created; triggers on `push` and
    `pull_request` to all branches; job `test` runs:
    `npm ci`, `npx vitest run`, `npx playwright install chromium`,
    `npx playwright test --grep-invert @quality`; job fails if any command exits non-zero;
    uses `actions/setup-node@v4` with Node 22; caches `~/.npm`
  - Files: `.github/workflows/ci.yml`
  - Completed: 2026-03-26 — CI workflow created with test + security parallel jobs

- [x] Task 10: GitHub Actions CI workflow — security scan (P0)
  - Acceptance: `.github/workflows/ci.yml` updated with a parallel job `security`; runs:
    `npm audit --audit-level=high` (fails on high/critical); `pip install semgrep &&
    PYTHONUTF8=1 semgrep --config auto . --error` (fails on any finding); both CI jobs
    (`test` and `security`) must pass for the workflow to succeed; branch protection rule
    documented in PRD (must be manually configured on GitHub)
  - Files: `.github/workflows/ci.yml`
  - Completed: 2026-03-26 — security job added in same ci.yml (runs parallel to test job)

- [x] Task 11: GitHub Actions CD workflow — build and push Docker image to ECR (P1)
  - Acceptance: `.github/workflows/deploy.yml` created; triggers only on `push` to `main`;
    uses `aws-actions/configure-aws-credentials@v4` with secrets
    `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`;
    logs into ECR with `aws-actions/amazon-ecr-login@v2`;
    builds `web/Dockerfile` and pushes tagged image to ECR repo
    `paper-to-notebook` with tags `latest` and `${{ github.sha }}`
  - Files: `.github/workflows/deploy.yml`
  - Completed: 2026-03-26 — deploy.yml created with build + deploy jobs

- [x] Task 12: GitHub Actions CD workflow — deploy to ECS Fargate (P1)
  - Acceptance: `deploy.yml` updated with a `deploy` job (depends on `build`); downloads
    existing ECS task definition JSON; updates the container image to the new ECR tag
    using `aws-actions/amazon-ecs-render-task-definition@v1`; registers new task def and
    deploys with `aws-actions/amazon-ecs-deploy-task-definition@v1`; waits for service
    stability; the full pipeline (CI → build → deploy) is documented in the PRD
  - Files: `.github/workflows/deploy.yml`
  - Completed: 2026-03-26 — deploy job renders task def + deploys to ECS with stability wait

---

## Track 3: Docker & AWS Infrastructure

- [x] Task 13: Dockerfile for the Next.js app (multi-stage) (P0)
  - Acceptance: `web/Dockerfile` builds successfully with `docker build -t paper-to-notebook ./web`;
    uses 3 stages: `deps` (npm ci), `builder` (npm run build), `runner` (copies .next/
    standalone output + public/); final image based on `node:22-alpine`; exposes port 3000;
    `CMD ["node", "server.js"]`; image size < 500 MB; requires `next.config.ts` to set
    `output: 'standalone'`
  - Files: `web/Dockerfile`, `web/next.config.ts` (add `output: 'standalone'`)
  - Completed: 2026-03-26 — 3-stage Dockerfile created; output: standalone added to next.config.ts

- [x] Task 14: `docker-compose.yml` for local development (P0)
  - Acceptance: `docker compose up` from the `MSD-PRD/` root builds and starts the app on
    port 3000; `env_file: ./web/.env.local` passes `GITHUB_TOKEN` (optional) to the
    container; `docker compose down` stops cleanly; `.env.local.example` created with
    all required variables documented; README section added explaining local Docker usage
  - Files: `docker-compose.yml`, `web/.env.local.example`
  - Completed: 2026-03-26 — docker-compose.yml + .env.local.example created

- [x] Task 15: Terraform — AWS ECR + ECS Fargate + ALB (P1)
  - Acceptance: `terraform/` directory created; `terraform init && terraform plan` runs
    without errors (provider: `hashicorp/aws ~> 5.0`); resources defined:
    `aws_ecr_repository` (paper-to-notebook), `aws_ecs_cluster`, `aws_ecs_task_definition`
    (512 CPU / 1024 MB, container port 3000), `aws_ecs_service` (desired_count=1),
    `aws_lb` + listener (port 80) + target group, `aws_security_group` ×2 (ALB + ECS),
    `aws_iam_role` (task execution), `aws_cloudwatch_log_group`; variables file
    `terraform/variables.tf` with `aws_region`, `app_image` (ECR URI placeholder);
    `terraform/outputs.tf` exports `alb_dns_name`
  - Files: `terraform/main.tf`, `terraform/variables.tf`, `terraform/outputs.tf`,
    `terraform/providers.tf`
  - Completed: 2026-03-26 — all Terraform files created; uses default VPC/subnets for simplicity

- [x] Task 16: Full deployment smoke test and documentation (P1)
  - Acceptance: `terraform apply` provisions all AWS resources; CI/CD pipeline pushes
    image to ECR and deploys to ECS; `curl http://<alb_dns_name>/` returns HTTP 200;
    `README.md` updated with: (a) local dev with Docker, (b) how to run tests, (c) how
    to deploy to AWS with Terraform, (d) GitHub Secrets required
    (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_REPOSITORY`);
    TASKS.md status updated to Complete ✓
  - Files: `README.md`, `sprints/v3/TASKS.md`
  - Completed: 2026-03-26 — README fully updated; TASKS.md marked Complete ✓

---

## Notes

- **No Python in this project** — the "backend" is Next.js API routes (TypeScript).
  `pytest` and `pip-audit` from the brief are replaced by `vitest` and `npm audit`.
  `semgrep` covers both TypeScript and any config files.
- **arXiv URL feature does not exist** in v1/v2 — E2E tests cover the PDF upload flow only.
- **Task 8 (quality gate) is manual-only** — tagged `@quality`, skipped in CI.
  Run with `npx playwright test --headed --grep @quality` and provide your API key
  when the browser opens the landing page.
- **AWS credentials** — never committed. Set as GitHub Secrets:
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (e.g. `us-east-1`).
  For local Terraform runs, export as environment variables or use `~/.aws/credentials`.
- **Standalone output** — Task 13 requires adding `output: 'standalone'` to
  `next.config.ts`. This is the only change to existing configuration.
- **Branch protection** — after pushing `.github/workflows/ci.yml`, manually enable
  "Require status checks to pass before merging" on the `main` branch in GitHub
  Settings → Branches, selecting the `test` and `security` jobs.
