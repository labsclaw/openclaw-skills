# Example: Creating a Complex Multi-Domain Skill

A complex skill uses progressive disclosure with reference files for
multiple domains.

## Scenario

User: "Create a skill for cloud deployment that supports AWS, GCP, and Azure"

## Phase 2: Analysis

- **Skill type**: Reference (multiple domains)
- **Degrees of freedom**: Low (deployments are fragile)
- **Progressive disclosure**: Essential — each cloud provider has 100+ lines of docs

## Phase 3: Generated Structure

```
cloud-deploy/
├── SKILL.md                      ← Overview + routing (≤200 lines)
├── references/
│   ├── aws.md                    ← AWS-specific deployment guide
│   ├── gcp.md                    ← GCP-specific deployment guide
│   ├── azure.md                  ← Azure-specific deployment guide
│   └── troubleshooting.md        ← Cross-platform error resolution
├── scripts/
│   ├── deploy-aws.sh             ← AWS deployment script
│   ├── deploy-gcp.sh             ← GCP deployment script
│   └── deploy-azure.sh           ← Azure deployment script
└── examples/
    └── deploy-nextjs.md          ← Example: deploying a Next.js app
```

## Generated SKILL.md (Key Sections)

```markdown
---
name: cloud-deploy
description: >-
  Use when deploying applications to cloud providers (AWS, GCP, Azure),
  setting up CI/CD pipelines, configuring cloud infrastructure, or
  troubleshooting deployment failures. Trigger terms: deploy, AWS, GCP,
  Azure, cloud, CI/CD, infrastructure, hosting, production deploy.
---

# Cloud Deploy

Deploy applications to AWS, GCP, or Azure with standardized workflows.

## How It Works

### Step 1: Identify Target
Determine which cloud provider the user needs.

### Step 2: Load Provider Guide
Read ONLY the relevant reference file:

- **AWS**: See [references/aws.md](references/aws.md)
- **GCP**: See [references/gcp.md](references/gcp.md)
- **Azure**: See [references/azure.md](references/azure.md)

### Step 3: Execute Deployment
Run the provider-specific deployment script:

\`\`\`bash
bash scripts/deploy-aws.sh <app-name> <region>
bash scripts/deploy-gcp.sh <app-name> <project-id>
bash scripts/deploy-azure.sh <app-name> <resource-group>
\`\`\`

### Step 4: Verify
Confirm deployment succeeded and provide the live URL.

**Troubleshooting**: See [references/troubleshooting.md](references/troubleshooting.md)
```

## Key Pattern: Domain-Specific Organization

When a user asks about AWS deployment, the agent loads ONLY `references/aws.md`.
It never loads GCP or Azure docs — saving hundreds of tokens.

```
User: "Deploy my app to AWS"
Agent reads: SKILL.md (200 lines) + references/aws.md (150 lines)
Agent ignores: references/gcp.md, references/azure.md
Total tokens: ~350 lines instead of ~650 lines
```

## Phase 4: Validation Score

```
Description Quality: 18/20
Structure: 14/15
Documentation: 13/15
Completeness: 14/15
Token Efficiency: 10/10 (excellent progressive disclosure)
Model-Agnostic: 10/10
Testing: 7/10
Security: 5/5

TOTAL: 91/100 → 🟢 Excellent
```
