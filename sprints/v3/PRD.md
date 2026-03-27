# Sprint v3 — PRD: Production-Ready (Testing · CI/CD · Docker · AWS)

## Overview

Sprint v3 makes PaperToNotebook production-deployable. Three parallel tracks:
(1) a complete test suite following the testing pyramid — unit, integration, and E2E
including a real notebook quality validation test; (2) a GitHub Actions CI/CD pipeline
that gates every PR on passing tests and security scans; (3) Docker packaging and
AWS ECS Fargate deployment with Terraform, wired to a CD pipeline that auto-deploys
on every merge to `main`. No existing functionality is changed.

---

## Goals

- **Testing pyramid complete**: ≥70% unit, ≥20% integration, ≤10% E2E by test count
- **CI gates every PR**: Vitest + Playwright + semgrep + npm audit — merge blocked on failure
- **Real quality gate**: headed Playwright test generates a notebook from
  `C:\MyData\paper.pdf` ("Attention Is All You Need"), validates JSON structure,
  12 sections, valid Python, no dangerous code
- **One-command local stack**: `docker compose up` starts the full app
- **AWS live**: `terraform apply` provisions ECS Fargate + ALB; CD pipeline
  auto-deploys on merge to `main`

---

## User Stories

- As a developer, I want `npm test` to run unit + integration tests locally in <30s,
  so I can iterate confidently without waiting for CI
- As a developer, I want every PR to be gated by tests and security scans,
  so that broken or insecure code cannot reach `main`
- As an operator, I want `docker compose up` to start the app with one command,
  so that anyone can run the full stack locally without installing Node
- As an operator, I want merging to `main` to auto-deploy to AWS ECS Fargate,
  so that the live app always reflects the latest passing code
- As a product owner, I want a real end-to-end quality test with a known paper,
  so I have confidence the notebook output meets the quality bar

---

## Technical Architecture

### Stack (unchanged from v1/v2)

| Layer | Technology |
|-------|-----------|
| Frontend + Backend | Next.js 16 App Router (TypeScript) |
| PDF extraction | `lib/pdf-parser.ts` (pdf-parse) |
| AI generation | `lib/openai-client.ts` (OpenAI SDK, gpt-4o-mini) |
| Notebook building | `lib/notebook-builder.ts` |
| Prompt engineering | `lib/prompt.ts` |
| Security | `lib/sanitize.ts`, `lib/notebook-scanner.ts` |
| Logging | `lib/logger.ts` |
| Session | `lib/session.ts` (sessionStorage) |
| Unit/Integration tests | Vitest |
| E2E tests | Playwright |
| Container | Docker (multi-stage Node.js build) |
| Cloud | AWS ECS Fargate + ECR + ALB + ACM |
| IaC | Terraform |
| CI/CD | GitHub Actions |

### CI/CD Flow

```
Push / PR to any branch
        │
        ▼
┌────────────────────────────────────────────┐
│  GitHub Actions: ci.yml                    │
│                                            │
│  job: test                                 │
│    npx vitest run          (unit + integ.) │
│    npx playwright test     (E2E headless)  │
│                                            │
│  job: security (parallel with test)        │
│    semgrep --config auto .                 │
│    npm audit --audit-level=high            │
│                                            │
│  Branch protection: both jobs must pass    │
└──────────────────┬─────────────────────────┘
                   │ (only on push to main)
                   ▼
┌────────────────────────────────────────────┐
│  GitHub Actions: deploy.yml                │
│                                            │
│  1. docker build + push to AWS ECR         │
│  2. ecs update-service (force new deploy)  │
│     → ECS Fargate pulls new image          │
│     → Rolling update, zero downtime        │
└────────────────────────────────────────────┘
```

### Docker Architecture

```
┌──────────────────────────────────────┐
│  Dockerfile (multi-stage)            │
│                                      │
│  Stage 1: deps                       │
│    FROM node:22-alpine               │
│    COPY package*.json                │
│    RUN npm ci --omit=dev             │
│                                      │
│  Stage 2: builder                    │
│    COPY . .                          │
│    RUN npm run build                 │
│                                      │
│  Stage 3: runner                     │
│    FROM node:22-alpine               │
│    COPY --from=builder .next/        │
│    EXPOSE 3000                       │
│    CMD ["node", "server.js"]         │
└──────────────────────────────────────┘

docker-compose.yml
  services:
    app:
      build: ./web
      ports: 3000:3000
      env_file: .env.local
```

### AWS Infrastructure (Terraform)

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  ALB (port 80)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  ECS Fargate    │
              │  Service        │
              │  (1 task min,   │
              │   2 task max)   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ECR Repository │
              │  (Docker image) │
              └─────────────────┘

Resources:
  - aws_ecr_repository
  - aws_ecs_cluster
  - aws_ecs_task_definition (512 CPU, 1024 MB)
  - aws_ecs_service
  - aws_lb + aws_lb_listener + aws_lb_target_group
  - aws_security_group (ALB: 80 inbound; ECS: 3000 from ALB)
  - aws_iam_role (ECS task execution role)
  - aws_cloudwatch_log_group (/ecs/paper-to-notebook)
```

### AWS Credentials

- IAM user `paper-to-notebook-deploy` access keys stored as GitHub Secrets:
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- Same values set as `TF_VAR_aws_access_key` / `TF_VAR_aws_secret_key` for
  Terraform local runs
- **Never committed to the repository**

---

## Test Coverage Targets

### Testing Pyramid

```
        ┌──────────┐
        │  E2E     │  ~10%  (Playwright — full browser flows)
        ├──────────┤
        │ Integrat.│  ~20%  (Vitest — API routes, mocked OpenAI/GitHub)
        ├──────────┤
        │  Unit    │  ~70%  (Vitest — lib/* pure functions)
        └──────────┘
```

### Unit Test Targets (`tests/unit/`)

| Module | Tests to add |
|--------|-------------|
| `lib/pdf-parser.ts` | valid PDF → text, min length guard, page count, truncation |
| `lib/notebook-builder.ts` | `buildJupyterNotebook()` shape, cell types, `notebookToJson()` valid JSON, `slugify()` edge cases |
| `lib/prompt.ts` | `buildNotebookPrompt()` contains system + user keys, includes paperText in user prompt |
| `lib/openai-client.ts` | `OPENAI_MODEL` constant exported, fallback chain defined |
| `lib/gist-client.ts` | hex ID validation regex, Colab URL construction |

### Integration Test Targets (`tests/integration/`)

| Endpoint | Tests to add |
|----------|-------------|
| `POST /api/extract` | valid PDF → 200 + `{ text, pageCount }`, non-PDF → 400, oversized → 400 |
| `POST /api/generate` | valid body + mocked OpenAI → SSE `done` event, bad key → 400, long text → 400, rate limit → 429 |
| `POST /api/notebook/publish` | valid body + mocked GitHub → 200 + `colabUrl`, missing body → 400, GitHub error → 502 |

### E2E Test Targets (`tests/e2e/`)

| Test | Description |
|------|-------------|
| Full PDF flow | Enter API key → upload PDF → processing spinner → result page → download |
| Quality gate | Headed browser, upload `C:\MyData\paper.pdf`, validate notebook JSON structure |

---

## Out of Scope (v4+)

- HTTPS / ACM certificate (requires a domain name)
- Multi-region AWS deployment
- RDS / persistent notebook storage
- User authentication / accounts
- Upstash Redis rate limiting (documented in v2 as upgrade path)
- Nonce-based CSP (documented in v2 as upgrade path)
- Auto-scaling policies beyond min=1/max=2
- Monitoring / alerts (CloudWatch alarms, PagerDuty)

---

## Dependencies

- v1 + v2 complete ✓
- GitHub repository with `main` branch (for Actions to trigger on)
- AWS IAM user `paper-to-notebook-deploy` with access keys (created ✓)
  — required IAM policies: `AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryFullAccess`,
  `ElasticLoadBalancingFullAccess`, `IAMFullAccess`, `CloudWatchLogsFullAccess`,
  `AmazonVPCFullAccess`
- Docker Desktop installed locally (for `docker compose up`)
- Terraform CLI installed locally (`brew install terraform` / `choco install terraform`)
- `C:\MyData\paper.pdf` — "Attention Is All You Need" PDF for quality gate test
