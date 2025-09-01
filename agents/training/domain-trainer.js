import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class DomainTrainer {
  constructor() {
    this.trainingPath = join(process.cwd(), 'agents', 'training', 'domains');
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!existsSync(this.trainingPath)) {
      mkdirSync(this.trainingPath, { recursive: true });
    }
  }

  async trainAgent(agentName, domainKnowledge) {
    console.log(`Training ${agentName} with domain-specific knowledge...`);
    
    const trainingSession = this.buildTrainingSession(agentName, domainKnowledge);
    const result = await this.executeTraining(agentName, trainingSession);
    
    await this.saveTrainingResults(agentName, result);
    return result;
  }

  buildTrainingSession(agentName, domainKnowledge) {
    const sessions = {
      'frontend-developer': this.buildFrontendTraining(domainKnowledge),
      'backend-developer': this.buildBackendTraining(domainKnowledge),
      'database-admin': this.buildDatabaseTraining(domainKnowledge),
      'qa-devops': this.buildQADevOpsTraining(domainKnowledge)
    };

    return sessions[agentName] || this.buildGenericTraining(domainKnowledge);
  }

  buildFrontendTraining(knowledge) {
    return `DOMAIN TRAINING SESSION - FRONTEND DEVELOPER

Your specialized domain: Frontend Development with Next.js, React, Tailwind CSS, AWS Amplify

CORE TECHNOLOGIES:
- Next.js 15+ (App Router, Server Components, Static Generation)
- React 19+ (Hooks, Functional Components, Suspense)
- TypeScript (Strict mode, proper typing)
- Tailwind CSS (Utility-first, responsive design)
- tRPC (Type-safe API calls)
- React Hook Form + Zod (Form handling & validation)
- AWS Amplify (Hosting, CI/CD, Authentication)

NEXT.JS SPECIALIZATION:
- App Router architecture (app/ directory)
- Server Components vs Client Components
- Static Site Generation (SSG) and Server-Side Rendering (SSR)
- API Routes and Route Handlers
- Middleware and Edge Runtime
- Image optimization with next/image
- Font optimization with next/font
- Metadata API for SEO

AWS AMPLIFY INTEGRATION:
- Amplify Hosting for Next.js deployment
- Amplify CI/CD pipelines
- Amplify Auth for authentication
- Amplify Storage for file uploads
- Environment variables and secrets
- Custom domains and SSL
- Branch-based deployments
- Performance monitoring

PROJECT STRUCTURE PATTERNS:
- src/app/ - Next.js App Router pages and layouts
- src/components/ - Reusable React components
- src/lib/ - Utility functions and configurations
- src/hooks/ - Custom React hooks
- src/types/ - TypeScript type definitions
- amplify/ - AWS Amplify configuration
- public/ - Static assets

CODING STANDARDS:
- Use functional components with TypeScript
- Implement proper error boundaries
- Follow accessibility guidelines (WCAG)
- Use semantic HTML elements
- Implement loading states and error handling
- Mobile-first responsive design
- SEO optimization with Next.js metadata

COMPONENT PATTERNS:
- Server Components for data fetching
- Client Components for interactivity
- Props interfaces with TypeScript
- Compound components for complex UI
- Custom hooks for logic reuse
- Context for state management

DEPLOYMENT & PERFORMANCE:
- Amplify deployment configuration
- Build optimization strategies
- Image and font optimization
- Bundle analysis and code splitting
- Performance monitoring
- Core Web Vitals optimization

Remember: You create user interfaces that are accessible, performant, SEO-friendly, and deployable on AWS Amplify.

${knowledge.frontend || ''}`;
  }

  buildBackendTraining(knowledge) {
    return `DOMAIN TRAINING SESSION - BACKEND DEVELOPER

Your specialized domain: Backend Development with tRPC, Prisma, Node.js

CORE TECHNOLOGIES:
- tRPC (Type-safe APIs, routers, procedures)
- Prisma (ORM, migrations, type generation)
- Node.js (Server-side JavaScript)
- Zod (Schema validation)
- JWT/Sessions (Authentication)
- PostgreSQL/DynamoDB (Database)

API ARCHITECTURE:
- src/server/api/ - tRPC router definitions
- src/server/auth.ts - Authentication logic
- src/server/db.ts - Database connection
- prisma/schema.prisma - Database schema

CODING STANDARDS:
- Input validation with Zod schemas
- Proper error handling and status codes
- Authentication middleware
- Rate limiting and security
- Database transaction handling
- Type-safe database queries

Remember: You build secure, scalable, and maintainable APIs.

${knowledge.backend || ''}`;
  }

  buildDatabaseTraining(knowledge) {
    return `DOMAIN TRAINING SESSION - DATABASE ADMIN

Your specialized domain: Database Design, Prisma, PostgreSQL

CORE TECHNOLOGIES:
- Prisma (ORM, migrations, schema management)
- PostgreSQL (Relational database)
- SQL (Queries, indexes, optimization)
- Database design principles
- Performance monitoring

Remember: You ensure data integrity, performance, and scalability.

${knowledge.database || ''}`;
  }

  buildQADevOpsTraining(knowledge) {
    return `DOMAIN TRAINING SESSION - QA & DEVOPS

Your specialized domain: Testing, CI/CD, Deployment, Operations

CORE TECHNOLOGIES:
- Jest (Unit testing framework)
- Testing Library (Component testing)
- Playwright/Cypress (E2E testing)
- GitHub Actions (CI/CD)
- AWS Amplify (Deployment)

Remember: You ensure quality, reliability, and operational excellence.

${knowledge.devops || ''}`;
  }

  async executeTraining(agentName, trainingSession) {
    const agentMapping = {
      'frontend-developer': 'frontend',
      'backend-developer': 'backend',
      'database-admin': 'database',
      'qa-devops': 'devops'
    };

    const qAgentName = agentMapping[agentName] || agentName;

    return new Promise((resolve, reject) => {
      const qProcess = spawn('q', ['/agent', qAgentName], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      qProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      qProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      qProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Training failed for ${agentName}: ${errorOutput}`));
        }
      });

      const trainingInput = `${trainingSession}\n\nPlease confirm you understand your domain specialization and are ready to work within these guidelines. Respond with "TRAINING COMPLETE" and a summary of your key capabilities.\n\n/quit\n`;
      qProcess.stdin.write(trainingInput);
      qProcess.stdin.end();
    });
  }

  async saveTrainingResults(agentName, result) {
    const trainingFile = join(this.trainingPath, `${agentName}-training.json`);
    const trainingData = {
      agent: agentName,
      timestamp: new Date().toISOString(),
      result: result,
      status: 'completed'
    };

    writeFileSync(trainingFile, JSON.stringify(trainingData, null, 2));
  }
}
