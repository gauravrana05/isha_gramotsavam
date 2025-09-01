# Agent Training Guide

This guide explains how to train the 8 specialized AI agents in the Dhrit platform with domain knowledge and coordination protocols.

## Overview

The Dhrit platform uses two types of training:
1. **Domain Training**: Specialized knowledge for each agent's technology stack
2. **Protocol Training**: Coordination and communication standards

## Agent Specializations

### Core Agents (4)
- **Roop** (रूप) - Frontend Developer: Next.js, React, Tailwind CSS, AWS Amplify
- **Mool** (मूल) - Backend Developer: tRPC, Prisma, Node.js, Authentication
- **Kosh** (कोश) - Database Admin: Prisma, PostgreSQL, Schema Design
- **Dhar** (धार) - QA & DevOps: Testing, CI/CD, Deployment

### Enterprise Agents (4)
- **Kalp** (कल्प) - Design System: Design tokens, component systems, brand identity
- **Bandh** (बंध) - Security: Security audits, compliance, vulnerability scanning
- **Gati** (गति) - Performance: Optimization, caching, load testing
- **Pal** (पाल) - Architecture: Microservices, system design, scalability patterns

## Domain Training

### Roop (Frontend Developer)
Trained on:
- Next.js 15+ (App Router, Server Components, Static Generation)
- React 19+ (Hooks, Functional Components, Suspense)
- TypeScript (Strict mode, proper typing)
- Tailwind CSS (Utility-first, responsive design)
- AWS Amplify (Hosting, CI/CD, Authentication)
- tRPC (Type-safe API calls)
- React Hook Form + Zod (Form handling & validation)

### Mool (Backend Developer)
Trained on:
- tRPC (Type-safe APIs, routers, procedures)
- Prisma (ORM, migrations, type generation)
- Node.js (Server-side JavaScript)
- Zod (Schema validation)
- JWT/Sessions (Authentication)
- PostgreSQL (Database)

### Kosh (Database Admin)
Trained on:
- Prisma (ORM, migrations, schema management)
- PostgreSQL (Relational database)
- SQL (Queries, indexes, optimization)
- Database design principles
- Performance monitoring

### Dhar (QA & DevOps)
Trained on:
- Jest (Unit testing framework)
- Testing Library (Component testing)
- Playwright/Cypress (E2E testing)
- GitHub Actions (CI/CD)
- AWS Amplify (Deployment)

### Kalp (Design System)
Trained on:
- Design token creation (colors, typography, spacing)
- Component design system architecture
- Brand identity and visual guidelines
- UI/UX pattern libraries
- Accessibility and inclusive design

### Bandh (Security)
Trained on:
- Security audits and vulnerability scanning
- Authentication and authorization patterns
- Compliance frameworks (SOC2, GDPR, HIPAA)
- Security best practices implementation
- Penetration testing and security validation

### Gati (Performance)
Trained on:
- Performance optimization and monitoring
- Caching strategies (Redis, CDN, browser cache)
- Database query optimization
- Bundle optimization and code splitting
- Load testing and performance benchmarking

### Pal (Architecture)
Trained on:
- System architecture design and planning
- Microservices architecture patterns
- Scalability and infrastructure planning
- Event-driven architecture design
- Service mesh and API gateway patterns

## Protocol Training

All 8 agents are trained on:
- **Message Structure**: Standardized communication format
- **Dependency Management**: How to wait for and provide inputs
- **Handoff Requirements**: What each agent needs from others
- **Output Standards**: Complete, working code with documentation

## Training Commands

### Train Individual Agent
```bash
# Train specific agent with domain knowledge
dhrit___train-domain --agentName "roop"
dhrit___train-domain --agentName "mool"
dhrit___train-domain --agentName "kosh"
dhrit___train-domain --agentName "dhar"
dhrit___train-domain --agentName "kalp"
dhrit___train-domain --agentName "bandh"
dhrit___train-domain --agentName "gati"
dhrit___train-domain --agentName "pal"

# Train specific agent with coordination protocols
dhrit___train-protocol --agentName "roop"
```

### Train All Agents
```bash
# Train all 8 agents with both domain knowledge and protocols
dhrit___train-all-agents
```

## Training Process

1. **Domain Training**: Agent receives specialized knowledge for their technology stack
2. **Protocol Training**: Agent learns coordination and communication standards
3. **Confirmation**: Agent confirms understanding and readiness
4. **Storage**: Training results are saved for reference

## Training Results

Training results are stored in:
- `dhrit/training/domains/{agent-name}-training.json`
- `dhrit/training/protocols/{agent-name}-protocol.json`

## Best Practices

1. **Train Before Use**: Always train agents before assigning tasks
2. **Regular Updates**: Retrain agents when adding new capabilities
3. **Verify Training**: Check training results for successful completion
4. **Consistent Protocols**: Ensure all agents follow the same coordination standards

## Troubleshooting

**Training Fails**: Check Q CLI is available and `/agent` command works
**Incomplete Training**: Verify agent responds with "TRAINING COMPLETE"
**Protocol Issues**: Ensure all agents are protocol-trained for coordination
