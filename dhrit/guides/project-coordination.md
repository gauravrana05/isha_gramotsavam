# Project Coordination Guide

This guide explains how the 8 agents in the Dhrit platform coordinate to build complete applications through structured workflows.

## Coordination Architecture

### Redis-Based Message Queue
- **Location**: Redis Streams for real-time coordination
- **Format**: Structured JSON messages with task details
- **Status Tracking**: pending → in-progress → completed → failed

### PostgreSQL State Management
- **Location**: PostgreSQL/Supabase for persistent project state
- **Stages**: requirements → architecture → design → security → database → backend → frontend → performance → testing → deployment
- **Transitions**: Automatic progression based on agent completion

## 8-Agent Development Workflow

### Stage 1: Requirements Analysis
**All agents** review project requirements and prepare for coordination

### Stage 2: Architecture Planning
**Pal (Architecture)** leads system design
- Designs overall system architecture
- Defines scalability requirements
- Plans service integration patterns
- Provides architecture guidelines to all agents

### Stage 3: Design System Creation
**Kalp (Design System)** creates visual foundation
- Develops design tokens and component systems
- Creates brand identity and style guides
- Provides design specifications to **Roop**

### Stage 4: Security Planning
**Bandh (Security)** audits and plans security
- Reviews architecture for security requirements
- Plans authentication and authorization
- Defines compliance requirements
- Provides security guidelines to all agents

### Stage 5: Database Design
**Kosh (Database)** designs data layer
- Creates database schema based on **Pal's** architecture
- Implements **Bandh's** security requirements
- Optimizes for **Gati's** performance requirements
- Provides schema to **Mool**

### Stage 6: Backend Development
**Mool (Backend)** develops APIs
- Implements **Kosh's** database schema
- Follows **Pal's** architecture patterns
- Implements **Bandh's** security requirements
- Provides API specifications to **Roop**

### Stage 7: Frontend Development
**Roop (Frontend)** builds user interface
- Implements **Kalp's** design system
- Integrates with **Mool's** APIs
- Follows **Bandh's** security patterns
- Creates user-facing application

### Stage 8: Performance Optimization
**Gati (Performance)** optimizes all layers
- Optimizes **Roop's** frontend performance
- Enhances **Mool's** API performance
- Optimizes **Kosh's** database queries
- Implements caching and optimization strategies

### Stage 9: Testing & Quality Assurance
**Dhar (QA & DevOps)** tests complete system
- Tests all components from other agents
- Validates integration between layers
- Ensures quality and reliability
- Prepares deployment pipeline

### Stage 10: Deployment
**Dhar (QA & DevOps)** deploys to production
- Deploys complete application
- Sets up monitoring and alerting
- All agents monitor system health

## Agent Dependencies

### Roop (Frontend) Dependencies
**Depends on:**
- **Kalp**: Design tokens, component specifications
- **Mool**: API specifications, tRPC types
- **Bandh**: Security requirements, authentication patterns
- **Gati**: Performance requirements

**Provides to:**
- **Dhar**: Frontend components for testing
- **Gati**: Frontend code for optimization

### Mool (Backend) Dependencies
**Depends on:**
- **Kosh**: Database schema, Prisma client
- **Pal**: API architecture, service patterns
- **Bandh**: Security patterns, authentication
- **Gati**: Performance requirements, caching strategies

**Provides to:**
- **Roop**: API specifications, tRPC types
- **Dhar**: API endpoints for testing

### Kosh (Database) Dependencies
**Depends on:**
- **Pal**: Database architecture, scaling requirements
- **Bandh**: Data security, encryption requirements
- **Gati**: Performance requirements, indexing strategies

**Provides to:**
- **Mool**: Database schema, Prisma client, migrations
- **Dhar**: Database setup for testing

### Enterprise Agent Dependencies
**Kalp, Bandh, Gati, Pal** provide foundational requirements and guidelines to core agents throughout the development process.

## Coordination Commands

### Initialize Project
```bash
dhrit___init --projectId "my-app" --requirements "Your app description"
```

### Check Project Status
```bash
dhrit___status --projectId "my-app"
```

### Execute Full 8-Agent Workflow
```bash
dhrit___build --projectId "my-app" --requirements "Complete project requirements"
```

### Individual Agent Tasks
```bash
# Architecture planning
dhrit___pal --projectId "my-app" --task "Design system architecture" --requirements "Scalable architecture"

# Design system
dhrit___kalp --projectId "my-app" --task "Create design system" --requirements "Modern brand identity"

# Security planning
dhrit___bandh --projectId "my-app" --task "Security audit" --requirements "Enterprise security"

# Database design
dhrit___kosh --projectId "my-app" --task "Create schema" --requirements "User management schema"

# Backend development
dhrit___mool --projectId "my-app" --task "Create APIs" --requirements "Authentication APIs"

# Frontend development
dhrit___roop --projectId "my-app" --task "Build UI" --requirements "User dashboard"

# Performance optimization
dhrit___gati --projectId "my-app" --task "Optimize performance" --requirements "Sub-second load times"

# Testing and deployment
dhrit___dhar --projectId "my-app" --task "Test and deploy" --requirements "Production deployment"
```

## Message Structure

### Task Message
```json
{
  "id": "msg_123456789_abc123",
  "from": "coordinator",
  "to": "roop",
  "type": "task",
  "payload": {
    "task": "Create login form",
    "requirements": "React form with email/password validation",
    "context": {
      "projectId": "my-app",
      "currentStage": "frontend",
      "dependencies": ["mool-auth-api", "kalp-design-tokens"]
    }
  },
  "status": "pending",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Best Practices

### For Users
1. **Clear Requirements**: Provide detailed, specific requirements
2. **Check Dependencies**: Ensure previous stages are complete
3. **Monitor Progress**: Use project status to track development
4. **Iterative Refinement**: Provide feedback and adjustments

### For Agent Coordination
1. **Sequential Execution**: Follow dependency order
2. **Complete Handoffs**: Provide all necessary information
3. **Clear Communication**: Use structured message format
4. **Error Handling**: Address failures and blockers promptly

## Troubleshooting

**Agents Not Coordinating**: Check protocol training completion
**Missing Dependencies**: Verify previous agent outputs
**Stuck Workflow**: Check for blockers in project state
**Communication Issues**: Verify Redis and PostgreSQL connections
