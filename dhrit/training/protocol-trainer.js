import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ProtocolTrainer {
  constructor() {
    this.trainingPath = join(process.cwd(), 'dhrit', 'training', 'protocols');
    this.ensureTrainingDirectory();
  }

  ensureTrainingDirectory() {
    if (!existsSync(this.trainingPath)) {
      mkdirSync(this.trainingPath, { recursive: true });
    }
  }

  async trainAgentProtocol(agentName) {
    console.log(`Starting protocol training for ${agentName}...`);
    
    const protocolSession = this.buildProtocolTraining(agentName);
    const result = await this.executeProtocolTraining(agentName, protocolSession);
    
    await this.saveProtocolResults(agentName, result);
    return result;
  }

  buildProtocolTraining(agentName) {
    const baseProtocol = `PROTOCOL TRAINING SESSION - ${agentName.toUpperCase()}

You are part of the Dhrit multi-agent development platform. Learn these coordination protocols:

AGENT COORDINATION PROTOCOL:

1. MESSAGE STRUCTURE:
   - All messages follow JSON format with id, from, to, type, payload, status, timestamp
   - Message types: task, response, dependency, completion, error
   - Status values: pending, in-progress, completed, failed, blocked

2. DEVELOPMENT WORKFLOW:
   Stage 1: Requirements Analysis (All agents review)
   Stage 2: Architecture Planning (Pal leads, others contribute)
   Stage 3: Design System (Kalp creates, Roop implements)
   Stage 4: Security Planning (Bandh audits, others implement)
   Stage 5: Database Design (Kosh designs, Mool integrates)
   Stage 6: Backend Development (Mool develops, others integrate)
   Stage 7: Frontend Development (Roop develops, integrates with Mool)
   Stage 8: Performance Optimization (Gati optimizes all layers)
   Stage 9: Testing & QA (Dhar tests, others fix)
   Stage 10: Deployment (Dhar deploys, all agents monitor)

3. AGENT DEPENDENCIES:
   ${this.getAgentDependencies(agentName)}

4. HANDOFF REQUIREMENTS:
   ${this.getHandoffRequirements(agentName)}

5. COMMUNICATION STANDARDS:
   - Always acknowledge task receipt
   - Provide progress updates for long tasks
   - Signal completion with deliverables
   - Report blockers immediately
   - Request clarification when needed

6. OUTPUT STANDARDS:
   - Complete, working code
   - Clear documentation
   - Test coverage where applicable
   - Integration instructions
   - Next steps for dependent agents

Remember: You are part of a coordinated team. Your success depends on clear communication and reliable handoffs.`;

    return baseProtocol;
  }

  getAgentDependencies(agentName) {
    const dependencies = {
      'roop': `
   DEPENDS ON:
   - Kalp: Design system, component specifications, design tokens
   - Mool: API specifications, tRPC types, authentication flow
   - Bandh: Security requirements, authentication patterns
   - Gati: Performance requirements, optimization guidelines
   
   PROVIDES TO:
   - Dhar: Frontend components for testing
   - Gati: Frontend code for performance optimization
   - All: User interface implementation`,

      'mool': `
   DEPENDS ON:
   - Kosh: Database schema, Prisma client, query patterns
   - Pal: API architecture, service patterns, scalability requirements
   - Bandh: Security patterns, authentication, authorization
   - Gati: Performance requirements, caching strategies
   
   PROVIDES TO:
   - Roop: API specifications, tRPC types, authentication
   - Dhar: API endpoints for testing
   - All: Backend services and data access`,

      'kosh': `
   DEPENDS ON:
   - Pal: Database architecture, scaling requirements
   - Bandh: Data security, encryption requirements
   - Gati: Performance requirements, indexing strategies
   
   PROVIDES TO:
   - Mool: Database schema, Prisma client, migrations
   - Dhar: Database setup for testing
   - All: Data model and persistence layer`,

      'dhar': `
   DEPENDS ON:
   - Roop: Frontend components and pages
   - Mool: Backend APIs and services
   - Kosh: Database setup and test data
   - All agents: Complete implementations for testing
   
   PROVIDES TO:
   - All: Test results, deployment pipeline, quality assurance`,

      'kalp': `
   DEPENDS ON:
   - Requirements: Brand guidelines, design requirements
   - Pal: Component architecture requirements
   
   PROVIDES TO:
   - Roop: Design tokens, component specs, style guidelines
   - All: Design system, brand identity, UI patterns`,

      'bandh': `
   DEPENDS ON:
   - Pal: Security architecture requirements
   - Requirements: Compliance and security requirements
   
   PROVIDES TO:
   - All agents: Security requirements, patterns, audit results`,

      'gati': `
   DEPENDS ON:
   - All agents: Code implementations for optimization
   - Pal: Performance architecture requirements
   
   PROVIDES TO:
   - All agents: Performance requirements, optimization strategies`,

      'pal': `
   DEPENDS ON:
   - Requirements: Scalability and architecture requirements
   
   PROVIDES TO:
   - All agents: Architecture patterns, scalability guidelines, system design`
    };

    return dependencies[agentName] || 'No specific dependencies defined.';
  }

  getHandoffRequirements(agentName) {
    const handoffs = {
      'roop': `
   WHEN RECEIVING FROM KALP:
   - Design tokens (colors, typography, spacing)
   - Component specifications and variants
   - Responsive breakpoints and guidelines
   
   WHEN RECEIVING FROM MOOL:
   - tRPC router types and procedures
   - Authentication flow and components
   - API error handling patterns
   
   WHEN PROVIDING TO DHAR:
   - Complete component implementations
   - Page routing and navigation
   - Build configuration and deployment setup`,

      'mool': `
   WHEN RECEIVING FROM KOSH:
   - Prisma schema and client
   - Database connection configuration
   - Migration files and seed data
   
   WHEN PROVIDING TO ROOP:
   - tRPC router definitions and types
   - Authentication middleware and utilities
   - API documentation and usage examples`,

      'kosh': `
   WHEN PROVIDING TO MOOL:
   - Complete Prisma schema
   - Database connection setup
   - Migration strategy and files
   - Performance optimization recommendations`,

      'dhar': `
   WHEN RECEIVING FROM ALL:
   - Complete implementations ready for testing
   - Documentation and setup instructions
   - Environment configuration requirements
   
   WHEN PROVIDING TO ALL:
   - Test results and coverage reports
   - Deployment pipeline and configuration
   - Quality metrics and recommendations`,

      'kalp': `
   WHEN PROVIDING TO ROOP:
   - Design token files (JSON/CSS)
   - Component design specifications
   - Style guide and usage documentation
   - Accessibility guidelines and requirements`,

      'bandh': `
   WHEN PROVIDING TO ALL:
   - Security requirements and guidelines
   - Authentication and authorization patterns
   - Compliance checklists and validation
   - Security audit results and recommendations`,

      'gati': `
   WHEN PROVIDING TO ALL:
   - Performance budgets and targets
   - Optimization strategies and techniques
   - Monitoring and alerting setup
   - Performance test results and recommendations`,

      'pal': `
   WHEN PROVIDING TO ALL:
   - System architecture diagrams and patterns
   - Scalability guidelines and requirements
   - Service integration patterns
   - Infrastructure and deployment architecture`
    };

    return handoffs[agentName] || 'No specific handoff requirements defined.';
  }

  async executeProtocolTraining(agentName, protocolSession) {
    return new Promise((resolve, reject) => {
      const qProcess = spawn('q', ['/agent', this.mapAgentToQType(agentName)], {
        stdio: ['pipe', 'pipe', 'pipe']
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
          resolve(`Protocol training completed for ${agentName}:\n${output}`);
        } else {
          reject(new Error(`Protocol training failed for ${agentName}: ${errorOutput}`));
        }
      });

      qProcess.on('error', (error) => {
        reject(new Error(`Failed to start protocol training for ${agentName}: ${error.message}`));
      });

      // Send protocol training to agent
      qProcess.stdin.write(protocolSession);
      qProcess.stdin.write('\n\nPlease confirm you understand these coordination protocols by responding with "PROTOCOL TRAINING COMPLETE".\n');
      qProcess.stdin.end();
    });
  }

  mapAgentToQType(agentName) {
    const mapping = {
      'roop': 'frontend',
      'mool': 'backend', 
      'kosh': 'database',
      'dhar': 'devops',
      'kalp': 'design',
      'bandh': 'security',
      'gati': 'performance',
      'pal': 'architecture'
    };
    
    return mapping[agentName] || 'general';
  }

  async saveProtocolResults(agentName, result) {
    const protocolData = {
      agentName,
      trainingType: 'protocol',
      result,
      timestamp: new Date().toISOString()
    };

    const filePath = join(this.trainingPath, `${agentName}-protocol.json`);
    writeFileSync(filePath, JSON.stringify(protocolData, null, 2));
  }

  getProtocolResults(agentName) {
    const filePath = join(this.trainingPath, `${agentName}-protocol.json`);
    
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    
    return null;
  }
}
