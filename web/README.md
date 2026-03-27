# PaperToNotebook

Upload a research paper PDF → get a publication-quality Google Colab notebook in ~90 seconds.

Built with Next.js 16 (App Router), TypeScript, and GPT-4o-mini.

---

## Local development (Node.js)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Local development (Docker)

Requires Docker Desktop.

```bash
# 1. Copy the env example and add your GITHUB_TOKEN (optional)
cp web/.env.local.example web/.env.local

# 2. Start the app
docker compose up

# 3. Open http://localhost:3000

# 4. Stop
docker compose down
```

The `GITHUB_TOKEN` env var is optional — anonymous Gist creation works without it,
but a token avoids GitHub rate limits.

---

## Running tests

### Unit + integration tests (Vitest)

```bash
cd web
npx vitest run
```

### E2E tests (Playwright — headless, CI-safe)

```bash
cd web
npx playwright install chromium --with-deps
npx playwright test --grep-invert @quality
```

### Quality gate test (manual, headed, real OpenAI call)

Requires `C:\MyData\paper.pdf` ("Attention Is All You Need") and a real OpenAI API key.

```bash
cd web
npx playwright test tests/e2e/task8-quality-gate.spec.ts --headed --grep @quality
```

---

## Deploying to AWS with Terraform

### Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform CLI (`choco install terraform` / `brew install terraform`)
- Docker Desktop

### 1. Provision infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates: ECR repository, ECS cluster, Fargate task (512 CPU / 1024 MB),
ECS service, ALB on port 80, security groups, IAM task execution role,
and a CloudWatch log group.

After apply, note the `alb_dns_name` output — that is the live URL.

### 2. Push a Docker image

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ecr_repo_url>

# Build and push
docker build -t paper-to-notebook ./web
docker tag paper-to-notebook:latest <ecr_repo_url>:latest
docker push <ecr_repo_url>:latest
```

### 3. Verify the deployment

```bash
curl http://<alb_dns_name>/
# Should return HTTP 200
```

---

## GitHub Secrets (required for CI/CD)

Set these in your repository's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user `paper-to-notebook-deploy` access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `ECR_REPOSITORY` | ECR repo name (`paper-to-notebook`) |

### Branch protection

After pushing `.github/workflows/ci.yml`, manually enable
**"Require status checks to pass before merging"** on the `main` branch in
GitHub Settings → Branches, selecting the `test` and `security` jobs.

---

## CI/CD pipeline

```
Push / PR to any branch
        │
        ▼
  GitHub Actions: ci.yml
  ├── job: test   (Vitest + Playwright headless)
  └── job: security   (npm audit + semgrep)
        │ (only on push to main)
        ▼
  GitHub Actions: deploy.yml
  ├── job: build   (docker build + push to ECR)
  └── job: deploy  (ECS update-service, rolling deploy)
```
