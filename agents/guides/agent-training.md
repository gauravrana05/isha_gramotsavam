# Agent Training Guide

This guide explains how to train the specialized AI agents with domain knowledge and coordination protocols.

## Overview

The platform uses two types of training:
1. **Domain Training**: Specialized knowledge for each agent's technology stack
2. **Protocol Training**: Coordination and communication standards

## Domain Training

### Frontend Developer Agent
Trained on:
- Next.js 15+ (App Router, Server Components, Static Generation)
- React 19+ (Hooks, Functional Components, Suspense)
- TypeScript (Strict mode, proper typing)
- Tailwind CSS (Utility-first, responsive design)
- AWS Amplify (Hosting, CI/CD, Authentication)
- tRPC (Type-safe API calls)
- React Hook Form + Zod (Form handling & validation)

### Backend Developer Agent
Trained on:
- tRPC (Type-safe APIs, routers, procedures)
- Prisma (ORM, migrations, type generation)
- Node.js (Server-side JavaScript)
- Zod (Schema validation)
- JWT/Sessions (Authentication)
- PostgreSQL (Database)

### Database Admin Agent
Trained on:
- Prisma (ORM, migrations, schema management)
- PostgreSQL (Relational database)
- SQL (Queries, indexes, optimization)
- Database design principles
- Performance monitoring

### QA & DevOps Agent
Trained on:
- Jest (Unit testing framework)
- Testing Library (Component testing)
- Playwright/Cypress (E2E testing)
- GitHub Actions (CI/CD)
- AWS Amplify (Deployment)

## Protocol Training

All agents are trained on:
- **Message Structure**: Standardized communication format
- **Dependency Management**: How to wait for and provide inputs
- **Handoff Requirements**: What each agent needs from others
- **Output Standards**: Complete, working code with documentation

## Training Commands

### Train Individual Agent
```bash
# Train specific agent with domain knowledge
agents___train-domain --agentName "frontend-developer"
agents___train-domain --agentName "backend-developer"
agents___train-domain --agentName "database-admin"
agents___train-domain --agentName "qa-devops"

# Train specific agent with coordination protocols
agents___train-protocol --agentName "frontend-developer"
```

### Train All Agents
```bash
# Train all agents with both domain knowledge and protocols
agents___train-all-agents
```

## Training Process

1. **Domain Training**: Agent receives specialized knowledge for their technology stack
2. **Protocol Training**: Agent learns coordination and communication standards
3. **Confirmation**: Agent confirms understanding and readiness
4. **Storage**: Training results are saved for reference

## Training Results

Training results are stored in:
- `agents/training/domains/{agent-name}-training.json`
- `agents/training/protocols/{agent-name}-protocol.json`

## Best Practices

1. **Train Before Use**: Always train agents before assigning tasks
2. **Regular Updates**: Retrain agents when adding new capabilities
3. **Verify Training**: Check training results for successful completion
4. **Consistent Protocols**: Ensure all agents follow the same coordination standards

## Troubleshooting

**Training Fails**: Check Q CLI is available and `/agent` command works
**Incomplete Training**: Verify agent responds with "TRAINING COMPLETE"
**Protocol Issues**: Ensure all agents are protocol-trained for coordination
