# CI/CD Pipeline - Automated Testing & Deployment

## 🎯 **Pipeline Overview**

Our CI/CD pipeline ensures code quality through automated testing, coverage reporting, and deployment validation.

---

## 🏗️ **Pipeline Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                   Developer Workflow                     │
│                                                          │
│  1. Write Code + Tests                                   │
│  2. Pre-commit Hook (Local)                              │
│  3. Push to GitHub                                       │
│  4. CI Pipeline (GitHub Actions)                         │
│  5. Code Review + Coverage Report                        │
│  6. Merge to Main                                        │
│  7. Deployment Pipeline                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 **Pipeline Stages**

### **Stage 1: Pre-Commit (Local)**

**Tools**: Husky + lint-staged

**Checks**:
- ✅ Linting (ESLint)
- ✅ Formatting (Prettier)
- ✅ Type checking (TypeScript)
- ✅ Quick unit tests (changed files only)

**Setup**:
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Configuration** (`.husky/pre-commit`):
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test -- --onlyChanged --passWithNoTests
```

---

### **Stage 2: Pull Request CI (GitHub Actions)**

**Triggers**: PR opened, updated, or reopened

**Jobs**:

#### **Job 1: Test & Coverage**
```yaml
- name: Install dependencies
  run: npm ci

- name: Run linter
  run: npm run lint

- name: Run type check
  run: npm run build

- name: Run unit tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json

- name: Comment PR with coverage
  uses: romeovs/lcov-reporter-action@v0.3.1
  with:
    lcov-file: ./coverage/lcov.info
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

#### **Job 2: Integration Tests**
```yaml
- name: Start services (Docker Compose)
  run: docker-compose up -d postgres redis opensearch localstack

- name: Wait for services
  run: npm run wait-for-services

- name: Run migrations
  run: npm run db:migrate

- name: Run integration tests
  run: npm run test:integration

- name: Stop services
  run: docker-compose down
```

#### **Job 3: Security Scan**
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate

- name: Run Snyk security scan
  uses: snyk/actions/node@master
  with:
    args: --severity-threshold=high
```

**Coverage Requirements**:
- ✅ Overall coverage ≥ 85%
- ✅ Changed files coverage ≥ 85%
- ⚠️ PR blocked if coverage drops below threshold

---

### **Stage 3: Main Branch CI (GitHub Actions)**

**Triggers**: Push to main, merge from PR

**Jobs**:

#### **Job 1: Full Test Suite**
```yaml
- name: Run all tests
  run: npm run test:all

- name: Run E2E tests
  run: npm run test:e2e

- name: Generate coverage report
  run: npm run test:coverage

- name: Archive coverage report
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage/
```

#### **Job 2: Build & Validate**
```yaml
- name: Build application
  run: npm run build

- name: Validate build
  run: node dist/index.js --validate

- name: Archive build artifacts
  uses: actions/upload-artifact@v3
  with:
    name: build-artifacts
    path: dist/
```

---

### **Stage 4: Deployment Pipeline**

**Triggers**: Tag created (e.g., v1.0.0), manual trigger

**Environments**: 
- **Staging**: Auto-deploy from main
- **Production**: Manual approval required

**Jobs**:

#### **Job 1: Deploy to Staging**
```yaml
- name: Deploy to staging
  run: |
    # Deploy commands (e.g., Docker, K8s, AWS)
    
- name: Run smoke tests
  run: npm run test:smoke -- --env=staging

- name: Notify team
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Staging deployment complete'
```

#### **Job 2: Deploy to Production** (Manual)
```yaml
- name: Wait for approval
  uses: trstringer/manual-approval@v1
  with:
    approvers: team-leads

- name: Deploy to production
  run: |
    # Production deployment commands
    
- name: Run smoke tests
  run: npm run test:smoke -- --env=production

- name: Notify team
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Production deployment complete'
```

---

## 📊 **Coverage Reporting**

### **Automated Coverage Comments**

Every PR receives an automated comment:

```markdown
## Code Coverage Report

**Overall Coverage**: 87.3% (+2.1%)

| Metric     | Coverage | Change | Status |
|------------|----------|--------|--------|
| Lines      | 87.5%    | +2.3%  | ✅     |
| Branches   | 85.2%    | +1.8%  | ✅     |
| Functions  | 89.1%    | +2.5%  | ✅     |
| Statements | 87.8%    | +2.2%  | ✅     |

### Coverage by Context

| Context    | Coverage | Change | Status |
|------------|----------|--------|--------|
| User       | 91.2%    | +3.1%  | ✅     |
| Item       | 88.5%    | +2.5%  | ✅     |
| Trading    | 85.3%    | +1.2%  | ✅     |

**View detailed report**: [Coverage Report](link)
```

### **Coverage Trends**

Track coverage over time:
- **Codecov Dashboard**: Visual trends and insights
- **GitHub Status Checks**: Pass/fail on coverage threshold
- **Slack Notifications**: Alert on coverage drops

---

## 🚨 **Quality Gates**

### **Required Checks (Blocking)**

Before merge to main:
- ✅ All tests passing
- ✅ Coverage ≥ 85% overall
- ✅ No high-severity security vulnerabilities
- ✅ Linting passes
- ✅ TypeScript type check passes
- ✅ At least 1 approving review

### **Warning Checks (Non-blocking)**

- ⚠️ Coverage dropped by > 1%
- ⚠️ New medium-severity vulnerabilities
- ⚠️ Build size increased significantly
- ⚠️ Performance degradation detected

---

## 🛠️ **GitHub Actions Workflows**

### **Workflow Files Structure**

```
.github/
└── workflows/
    ├── pr-checks.yml           # PR testing and coverage
    ├── main-ci.yml             # Main branch full CI
    ├── deploy-staging.yml      # Staging deployment
    ├── deploy-production.yml   # Production deployment
    └── scheduled-tests.yml     # Nightly full test suite
```

### **Sample Workflow: PR Checks**

```yaml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  test-and-coverage:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run build
      
      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
      
      - name: Comment PR with coverage
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
          filter-changed-files: true
```

---

## 📈 **Performance Testing**

### **Automated Performance Benchmarks**

Run on every main branch commit:

```yaml
- name: Run performance tests
  run: npm run test:performance

- name: Compare with baseline
  run: |
    node scripts/compare-performance.js \
      --current ./performance-results.json \
      --baseline ./baseline-performance.json

- name: Fail if regression > 10%
  run: |
    if [ $(cat performance-regression.txt) -gt 10 ]; then
      echo "Performance regression detected!"
      exit 1
    fi
```

**Tracked Metrics**:
- API response times (p50, p95, p99)
- Database query performance
- Cache hit ratios
- Search query performance
- Image processing speed

---

## 🔐 **Security Scanning**

### **Automated Security Checks**

- **npm audit**: Check for vulnerable dependencies
- **Snyk**: Deep security scanning
- **GitHub Dependabot**: Automated dependency updates
- **SAST**: Static application security testing

### **Scheduled Scans**

Weekly security scan (Sunday midnight):
```yaml
name: Weekly Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk
        uses: snyk/actions/node@master
        with:
          command: test --all-projects
```

---

## 📧 **Notifications**

### **Slack Integration**

Notify on:
- ✅ Successful deployment
- ❌ Failed CI builds
- ⚠️ Coverage drops
- 🔒 Security vulnerabilities found
- 📊 Weekly summary reports

### **Email Notifications**

Notify on:
- Production deployments
- High-severity issues
- Coverage below threshold

---

## 🎯 **Best Practices**

### **DO:**
✅ Run tests locally before pushing
✅ Keep CI builds fast (< 10 minutes)
✅ Monitor coverage trends
✅ Address failing tests immediately
✅ Update baseline metrics regularly
✅ Review security scan results

### **DON'T:**
❌ Skip tests to merge faster
❌ Ignore coverage drops
❌ Deploy without smoke tests
❌ Leave failing tests in main
❌ Bypass required checks

---

## 📚 **Resources**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.com/)
- [Jest CI Configuration](https://jestjs.io/docs/continuous-integration)

---

*CI/CD Pipeline Documentation*  
*Established: October 8, 2024*  
*To be implemented: Phase 2.0+*

