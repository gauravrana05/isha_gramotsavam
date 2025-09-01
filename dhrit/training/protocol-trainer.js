import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ProtocolTrainer {
  constructor() {
    this.trainingPath = join(process.cwd(), 'agents', 'training', 'protocols');
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!existsSync(this.trainingPath)) {
      mkdirSync(this.trainingPath, { recursive: true });
    }
  }

  async trainAgentProtocol(agentName) {
    console.log(`Training ${agentName} on coordination protocols...`);
    
    const protocolTraining = this.buildProtocolTraining(agentName);
    const result = await this.executeProtocolTraining(agentName, protocolTraining);
    
    await this.saveProtocolTraining(agentName, result);
    return result;
  }

  buildProtocolTraining(agentName) {
    return `PROTOCOL TRAINING SESSION - ${agentName.toUpperCase()}

MULTI-AGENT COORDINATION PROTOCOL

You are part of a 4-agent development team:
1. Frontend Developer (Next.js, React, Amplify)
2. Backend Developer (tRPC, APIs, Auth)
3. Database Admin (Prisma, PostgreSQL, Schema)
4. QA & DevOps (Testing, CI/CD, Deployment)

COMMUNICATION PROTOCOL:

1. MESSAGE STRUCTURE:
   - Always include: Task ID, Dependencies, Outputs, Next Steps
   - Format: Clear, structured, actionable
   - Status: pending → in-progress → completed → failed

2. HANDOFF REQUIREMENTS:
   - Database Admin → Backend Developer: Schema + Migration files
   - Backend Developer → Frontend Developer: API specs + tRPC types
   - Frontend Developer → QA DevOps: Components + Pages for testing
   - All Agents → QA DevOps: Code for testing and deployment

3. DEPENDENCY MANAGEMENT:
   - Wait for required inputs from other agents
   - Clearly state what you need from others
   - Provide complete outputs for dependent agents
   - Signal when your work blocks others

4. OUTPUT STANDARDS:
   - Provide complete, working code
   - Include file paths and installation instructions
   - Document integration points
   - Specify testing requirements

YOUR SPECIFIC PROTOCOL ROLE:

${this.getAgentSpecificProtocol(agentName)}

COORDINATION RULES:

1. ALWAYS acknowledge dependencies:
   "Waiting for: [agent] to provide [specific output]"

2. ALWAYS provide complete handoffs:
   "Delivering to [agent]: [specific files/outputs]"
   "Integration notes: [how to use your output]"

3. ALWAYS signal completion:
   "Task complete. Next agent: [agent name]"
   "Blockers: [any issues that prevent next steps]"

4. ALWAYS maintain project context:
   - Reference project requirements
   - Maintain consistency with other agents' work
   - Follow established patterns and conventions

EXAMPLE COORDINATION FLOW:
1. Database Admin creates schema → signals Backend Developer
2. Backend Developer creates APIs → signals Frontend Developer  
3. Frontend Developer creates UI → signals QA DevOps
4. QA DevOps tests everything → signals deployment ready

Remember: You are part of a coordinated team. Your work enables others, and others enable your work.`;
  }

  getAgentSpecificProtocol(agentName) {
    const protocols = {
      'frontend-developer': `
FRONTEND DEVELOPER PROTOCOL:

INPUTS YOU NEED:
- API specifications from Backend Developer
- tRPC router types and procedures
- Authentication flow from Backend
- Design requirements from Linker

OUTPUTS YOU PROVIDE:
- React components with TypeScript
- Next.js pages and layouts
- Tailwind CSS styling
- Form handling and validation
- tRPC client integration
- Amplify deployment configuration

HANDOFF FORMAT:
- Component files: src/components/[ComponentName].tsx
- Page files: src/app/[route]/page.tsx
- Type definitions: src/types/[domain].ts
- Integration notes: How to connect with backend APIs
- Testing requirements: What QA should test

COORDINATION POINTS:
- Request API specs before building forms
- Confirm authentication flow before implementing auth UI
- Provide component documentation for testing
- Signal when UI is ready for integration testing`,

      'backend-developer': `
BACKEND DEVELOPER PROTOCOL:

INPUTS YOU NEED:
- Database schema from Database Admin
- Prisma client and types
- Business logic requirements from Linker
- Authentication requirements

OUTPUTS YOU PROVIDE:
- tRPC routers and procedures
- API endpoint specifications
- Authentication middleware
- Input/output validation schemas
- Database integration code
- Type definitions for frontend

HANDOFF FORMAT:
- Router files: src/server/api/routers/[domain].ts
- Type exports: Generated tRPC types
- API documentation: Endpoint specs and usage
- Authentication flow: How frontend should authenticate
- Database queries: Prisma usage examples

COORDINATION POINTS:
- Wait for database schema before creating APIs
- Provide complete tRPC types to Frontend
- Document authentication flow for Frontend
- Specify testing scenarios for QA DevOps`,

      'database-admin': `
DATABASE ADMIN PROTOCOL:

INPUTS YOU NEED:
- Data requirements from Linker
- Entity relationships and business rules
- Performance requirements
- Scalability considerations

OUTPUTS YOU PROVIDE:
- Prisma schema definitions
- Migration scripts
- Database indexes and constraints
- Seed data scripts
- Query optimization recommendations
- Performance monitoring setup

HANDOFF FORMAT:
- Schema file: prisma/schema.prisma
- Migration files: prisma/migrations/
- Seed script: prisma/seed.ts
- Documentation: Entity relationships and constraints
- Performance notes: Indexing and optimization strategies

COORDINATION POINTS:
- Provide complete schema before Backend starts
- Document all relationships for Backend Developer
- Specify performance considerations
- Provide migration strategies for DevOps`,

      'qa-devops': `
QA & DEVOPS PROTOCOL:

INPUTS YOU NEED:
- Frontend components from Frontend Developer
- API endpoints from Backend Developer
- Database schema from Database Admin
- Deployment requirements from Linker

OUTPUTS YOU PROVIDE:
- Test suites (unit, integration, e2e)
- CI/CD pipeline configuration
- Deployment scripts and configs
- Monitoring and logging setup
- Security and performance audits
- Documentation and runbooks

HANDOFF FORMAT:
- Test files: __tests__/[component].test.tsx
- Pipeline config: .github/workflows/ci.yml
- Deployment config: amplify.yml or vercel.json
- Monitoring setup: Performance and error tracking
- Documentation: Deployment and operational procedures

COORDINATION POINTS:
- Wait for all components before comprehensive testing
- Test integration between Frontend and Backend
- Validate database performance under load
- Coordinate deployment with all agents`
    };

    return protocols[agentName] || 'Generic coordination protocol';
  }

  async executeProtocolTraining(agentName, protocolTraining) {
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
          reject(new Error(`Protocol training failed for ${agentName}: ${errorOutput}`));
        }
      });

      const trainingInput = `${protocolTraining}\n\nPlease confirm you understand the coordination protocol and will follow these communication standards. Respond with "PROTOCOL TRAINING COMPLETE" and acknowledge your coordination responsibilities.\n\n/quit\n`;
      qProcess.stdin.write(trainingInput);
      qProcess.stdin.end();
    });
  }

  async saveProtocolTraining(agentName, result) {
    const trainingFile = join(this.trainingPath, `${agentName}-protocol.json`);
    const trainingData = {
      agent: agentName,
      type: 'protocol',
      timestamp: new Date().toISOString(),
      result: result,
      status: 'completed'
    };

    writeFileSync(trainingFile, JSON.stringify(trainingData, null, 2));
  }

  async trainAllAgentsProtocol() {
    const agents = ['frontend-developer', 'backend-developer', 'database-admin', 'qa-devops'];
    const results = [];

    for (const agent of agents) {
      try {
        const result = await this.trainAgentProtocol(agent);
        results.push({ agent, status: 'success', result });
      } catch (error) {
        results.push({ agent, status: 'failed', error: error.message });
      }
    }

    return results;
  }
}
