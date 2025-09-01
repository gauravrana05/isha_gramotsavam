# Dhrit Platform - Development Workflow Guide

This guide explains how to use the Dhrit platform to build complete applications through coordinated AI agents.

## 🚀 Complete Development Workflow

### Phase 1: Platform Setup

#### 1. Initial Setup
```bash
cd dhrit
cp .env.example .env
npm install
```

#### 2. Train All Agents
```bash
# Train domain expertise
./train-and-populate.sh

# Train coordination protocols
train-protocol --agentName "pal" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "kalp" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "bandh" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "kosh" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "mool" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "roop" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "gati" --protocols "coordination,handoff,dependencies"
train-protocol --agentName "dhar" --protocols "coordination,handoff,dependencies"
```

### Phase 2: Project Development

#### 1. Project Initialization
```bash
# Create new project with Next.js structure
init --projectId "my-app" --projectType "nextjs"
```

#### 2. Sequential Agent Coordination

##### Architecture Design (Pal)
```bash
pal --projectId "my-app" --task "Design system architecture" --requirements "Build a [description] with [tech stack]. Requirements: [list requirements]"
```

**Expected Output:**
- System architecture diagrams
- Technology stack decisions
- Scalability patterns
- Integration guidelines

##### Design System (Kalp)
```bash
kalp --projectId "my-app" --task "Create design system" --requirements "Design [style description] interface inspired by [references]. Include [components needed]"
```

**Expected Output:**
- Design tokens (colors, typography, spacing)
- Component specifications
- Layout patterns
- Brand guidelines

##### Security Planning (Bandh)
```bash
bandh --projectId "my-app" --task "Security architecture" --requirements "Secure [application type] with [security requirements]. Include [compliance needs]"
```

**Expected Output:**
- Security architecture
- Threat modeling
- Compliance checklist
- Security policies

##### Database Design (Kosh)
```bash
kosh --projectId "my-app" --task "Design database schema" --requirements "Database for [entities] with [relationships]. Optimize for [performance requirements]"
```

**Expected Output:**
- Prisma schema
- Migration scripts
- Indexing strategy
- Performance optimizations

##### Backend Development (Mool)
```bash
mool --projectId "my-app" --task "Build backend APIs" --requirements "tRPC APIs for [functionality]. Include [authentication/features]"
```

**Expected Output:**
- tRPC API routes
- Authentication system
- Business logic
- API documentation

##### Frontend Development (Roop)
```bash
roop --projectId "my-app" --task "Build user interface" --requirements "React interface implementing [design]. Include [features] with [interactions]"
```

**Expected Output:**
- React components
- Page layouts
- User interactions
- Responsive design

##### Performance Optimization (Gati)
```bash
gati --projectId "my-app" --task "Optimize performance" --requirements "Optimize for [performance targets]. Focus on [specific areas]"
```

**Expected Output:**
- Performance audit
- Optimization recommendations
- Caching strategies
- Monitoring setup

##### Testing & Deployment (Dhar)
```bash
dhar --projectId "my-app" --task "Test and deploy" --requirements "Deploy to [platform] with [testing requirements]. Include [monitoring needs]"
```

**Expected Output:**
- Test suites
- CI/CD pipeline
- Deployment configuration
- Live application URL

### Phase 3: Agent Coordination

#### Agent-to-Agent Communication

##### Request Pattern
```bash
request --fromAgent "[requesting-agent]" --toAgent "[target-agent]" --projectId "my-app" --requestType "[type]" --message "[detailed request]"
```

**Common Request Types:**
- `types` - TypeScript interfaces
- `review` - Code/design review
- `approval` - Security/architecture approval
- `feedback` - Performance/quality feedback
- `changes` - Modification requests

##### Response Pattern
```bash
respond --requestId "[request-id]" --fromAgent "[responding-agent]" --response "[detailed response]" --status "[status]"
```

**Response Statuses:**
- `approved` - Request approved, work can proceed
- `completed` - Work completed successfully
- `needs_changes` - Changes required before approval
- `rejected` - Request rejected with reasons

#### Common Coordination Scenarios

##### 1. Type Sharing (Mool → Roop)
```bash
# Roop requests types
request --fromAgent "roop" --toAgent "mool" --projectId "my-app" --requestType "types" --message "I need TypeScript interfaces for User, Task, and Project entities to build the frontend components"

# Mool provides types
respond --requestId "req_123..." --fromAgent "mool" --response "TypeScript types: interface User { id: string; name: string; email: string; }..." --status "completed"
```

##### 2. Security Review (Kosh → Bandh)
```bash
# Kosh requests security review
request --fromAgent "kosh" --toAgent "bandh" --projectId "my-app" --requestType "security_review" --message "Database schema ready for security review. Please check user data encryption and access controls"

# Bandh reviews and approves/requests changes
respond --requestId "req_456..." --fromAgent "bandh" --response "Schema approved with minor changes: encrypt email field and add audit trail" --status "needs_changes"
```

##### 3. Performance Feedback (Gati → Roop)
```bash
# Gati provides optimization feedback
request --fromAgent "gati" --toAgent "roop" --projectId "my-app" --requestType "feedback" --message "Component bundle is 45KB, needs optimization. Implement code splitting and lazy loading"

# Roop implements optimizations
respond --requestId "req_789..." --fromAgent "roop" --response "Optimizations implemented: bundle reduced to 12KB, lazy loading added" --status "completed"
```

### Phase 4: Project Management

#### Status Monitoring
```bash
# Check overall project status
status --projectId "my-app"

# Expected output shows agent progress and coordination status
```

#### Project Structure
```
dhrit/projects/my-app/
├── code/                    # Actual Next.js application
├── architecture/            # Pal's system designs
├── design/                  # Kalp's design specifications
├── security/                # Bandh's security documentation
├── database/                # Kosh's schemas and migrations
├── backend/                 # Mool's API specifications
├── frontend/                # Roop's component documentation
├── performance/             # Gati's optimization reports
├── qa/                      # Dhar's test plans and configs
├── coordination/            # Agent communication logs
│   └── requests/            # Request/response files
└── project-metadata.json   # Project tracking data
```

## 🎯 Best Practices

### 1. Clear Requirements
- Provide detailed, specific requirements for each agent
- Include technology preferences and constraints
- Specify performance and quality targets

### 2. Iterative Development
- Use agent coordination for feedback loops
- Request changes when outputs don't meet requirements
- Iterate until quality standards are met

### 3. Quality Gates
- Let Bandh review all security-sensitive components
- Have Gati optimize performance before deployment
- Ensure Dhar tests everything thoroughly

### 4. Documentation
- Each agent generates comprehensive documentation
- Coordination logs provide audit trail
- Project metadata tracks progress and decisions

## 🔧 Troubleshooting

### Common Issues

#### Agent Not Responding
```bash
# Check agent training status
[agent] --mode "train"

# Retrain if necessary
train-protocol --agentName "[agent]" --protocols "coordination,handoff,dependencies"
```

#### Coordination Failures
```bash
# Check project status
status --projectId "my-app"

# Review coordination logs
ls dhrit/projects/my-app/coordination/requests/
```

#### Quality Issues
```bash
# Request review from quality agents
request --fromAgent "[agent]" --toAgent "bandh" --projectId "my-app" --requestType "review" --message "Please review for security issues"
request --fromAgent "[agent]" --toAgent "gati" --projectId "my-app" --requestType "review" --message "Please review for performance issues"
```

### Performance Optimization

#### Agent Response Times
- Ensure Redis is running for coordination
- Check database connections for persistence
- Monitor agent workload and dependencies

#### Project Build Times
- Use incremental builds where possible
- Optimize agent handoff timing
- Parallel execution for independent tasks

## 🚀 Advanced Workflows

### Multi-Project Management
```bash
# Initialize multiple projects
init --projectId "frontend-app" --projectType "nextjs"
init --projectId "backend-service" --projectType "node"
init --projectId "mobile-app" --projectType "react"

# Coordinate across projects
request --fromAgent "roop" --toAgent "mool" --projectId "frontend-app" --requestType "api_integration" --message "Need API endpoints for mobile and web clients"
```

### Custom Agent Workflows
```bash
# Skip certain agents for simple projects
pal → kalp → roop → dhar  # Simple frontend-only project

# Add extra coordination for complex projects
pal → kalp → bandh → kosh → mool → roop → gati → dhar → gati → dhar  # Multiple optimization cycles
```

### Integration with External Tools
- Git integration for version control
- CI/CD pipeline integration
- Monitoring and alerting setup
- Custom deployment targets

This workflow enables building production-ready applications through coordinated AI agents, from initial requirements to deployed applications.
