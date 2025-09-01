# Isha Gramotsavam - Dhrit Platform

**Dhrit** - A production-ready multi-agent development platform that uses 8 specialized AI agents to build enterprise-grade full-stack applications automatically with real coordination and collaboration.

## 🤖 Dhrit Agent Architecture

### Core Development Agents (4)
- **Roop** (रूप) - Frontend Developer: Next.js 15+, React 19+, TypeScript, Tailwind CSS
- **Mool** (मूल) - Backend Developer: tRPC, Prisma, Node.js, Authentication, APIs
- **Kosh** (कोश) - Database Admin: PostgreSQL, Prisma, Schema Design, Performance
- **Dhar** (धार) - QA & DevOps: Testing, CI/CD, Deployment, Monitoring

### Enterprise Specialists (4)
- **Kalp** (कल्प) - Design System: Design tokens, component systems, brand identity
- **Bandh** (बंध) - Security: Security audits, compliance, vulnerability scanning
- **Gati** (गति) - Performance: Optimization, caching, load testing
- **Pal** (पाल) - Architecture: System design, microservices, scalability patterns

### Agent Coordination Features
- **Real-time communication**: Agent-to-agent requests and responses
- **Dependency management**: Automatic coordination of agent dependencies
- **Quality gates**: Agents can block progression until standards are met
- **Conflict resolution**: Architecture-led decision making
- **Project tracking**: Complete visibility into agent coordination

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Navigate to dhrit directory
cd dhrit

# Copy environment configuration
cp .env.example .env

# Configure Redis and PostgreSQL URLs in .env file
# Install dependencies
npm install
```

### 2. Train All Agents
```bash
# Train all 8 agents with domain knowledge
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

### 3. Initialize Project
```bash
# Create new Next.js project with coordination structure
init --projectId "my-app" --projectType "nextjs"
```

### 4. Execute Coordinated Development
```bash
# Architecture design
pal --projectId "my-app" --task "Design system architecture" --requirements "Build a task management app with real-time collaboration"

# Design system
kalp --projectId "my-app" --task "Create design system" --requirements "Professional interface inspired by Linear and Notion"

# Security planning
bandh --projectId "my-app" --task "Security architecture" --requirements "Secure authentication and data protection"

# Database design
kosh --projectId "my-app" --task "Design database schema" --requirements "Users, projects, tasks, and collaboration features"

# Backend APIs
mool --projectId "my-app" --task "Build backend APIs" --requirements "tRPC APIs with authentication and real-time features"

# Frontend interface
roop --projectId "my-app" --task "Build user interface" --requirements "React interface with real-time collaboration"

# Performance optimization
gati --projectId "my-app" --task "Optimize performance" --requirements "Sub-second load times and smooth interactions"

# Testing and deployment
dhar --projectId "my-app" --task "Test and deploy" --requirements "Deploy to Vercel with comprehensive testing"
```

### 5. Agent-to-Agent Coordination
```bash
# Agents can request help from each other
request --fromAgent "roop" --toAgent "mool" --projectId "my-app" --requestType "types" --message "I need TypeScript interfaces for the frontend components"

# Agents respond to requests
respond --requestId "req_123..." --fromAgent "mool" --response "Here are the TypeScript types: interface Task { id: string; title: string; ... }" --status "completed"

# Check project coordination status
status --projectId "my-app"
```

## 📁 Project Structure

```
dhrit/
├── mcp-server/              # MCP server for Q CLI integration
│   ├── server.js            # Main MCP server with 8 agents + coordination
│   ├── redis-manager.js     # Redis coordination layer
│   ├── database-manager.js  # PostgreSQL/Supabase persistence
│   ├── agent-coordinator.js # 8-agent workflow orchestration
│   ├── q-agent-executor.js  # Q Developer agent execution
│   └── project-storage.js   # Project file management
├── training/                # Agent domain and protocol training
│   ├── domain-trainer.js    # 8-agent domain training
│   ├── protocol-trainer.js  # 8-agent coordination protocols
│   ├── domains/             # Agent expertise files
│   └── protocols/           # Coordination protocol files
├── libraries/               # Reusable components per agent
│   ├── design/              # Kalp's design tokens, components
│   ├── frontend/            # Roop's React components, hooks, utils
│   ├── backend/             # Mool's tRPC routers, middleware, utils
│   ├── database/            # Kosh's Prisma schemas, migrations, queries
│   └── qa/                  # Dhar's test suites, configs, templates
├── projects/                # Generated projects
│   └── [project-id]/        # Individual project folders
│       ├── code/            # Actual Next.js/React project
│       ├── architecture/    # Pal's system designs
│       ├── design/          # Kalp's design specifications
│       ├── security/        # Bandh's security plans
│       ├── database/        # Kosh's schemas and migrations
│       ├── backend/         # Mool's API specifications
│       ├── frontend/        # Roop's component specifications
│       ├── performance/     # Gati's optimization reports
│       ├── qa/              # Dhar's test plans and deployment configs
│       ├── coordination/    # Agent communication logs
│       └── project-metadata.json # Project status and tracking
├── guides/                  # Documentation and guides
│   ├── training/            # Agent training guides
│   ├── communication-protocols.md # Coordination documentation
│   └── development-workflow.md # Usage guides
├── train-and-populate.sh    # Automated training script
└── .env.example             # Environment configuration template
```

## 🎯 Features

### Multi-Agent Coordination
- **Sequential handoffs**: Pal → Kalp → Kosh → Mool → Roop → Gati → Dhar
- **Parallel coordination**: Security, performance, and QA across all agents
- **Feedback loops**: Iterative optimization and quality improvements
- **Conflict resolution**: Architecture-led decision making
- **Quality gates**: Automatic blocking when standards not met

### Real-Time Collaboration
- **Agent-to-agent messaging**: Direct communication between agents
- **Request/response system**: Formal coordination protocols
- **Dependency tracking**: Automatic coordination of agent dependencies
- **Status monitoring**: Real-time project and agent status
- **Progress tracking**: Complete visibility into development progress

### Enterprise-Grade Output
- **Production-ready code**: Professional, scalable applications
- **Comprehensive testing**: Unit, integration, and E2E tests
- **Security compliance**: Built-in security best practices
- **Performance optimization**: Sub-second load times
- **Automated deployment**: CI/CD pipelines and monitoring

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma, Node.js, PostgreSQL
- **Testing**: Jest, Playwright, Testing Library
- **Infrastructure**: Redis, Supabase, Docker, Vercel
- **Coordination**: Redis Streams, PostgreSQL, MCP Protocol

## 📚 Documentation

### Training Guides
- [Agent Training Overview](./dhrit/guides/training/README.md)
- [Kalp (Design System) Training](./dhrit/guides/training/kalp-training.md)
- [Pal (Architecture) Training](./dhrit/guides/training/pal-training.md)
- [Roop (Frontend) Training](./dhrit/guides/training/roop-training.md)
- [Mool (Backend) Training](./dhrit/guides/training/mool-training.md)
- [Kosh (Database) Training](./dhrit/guides/training/kosh-training.md)
- [Bandh (Security) Training](./dhrit/guides/training/bandh-training.md)
- [Gati (Performance) Training](./dhrit/guides/training/gati-training.md)
- [Dhar (QA/DevOps) Training](./dhrit/guides/training/dhar-training.md)

### Coordination Documentation
- [Communication Protocols](./dhrit/guides/communication-protocols.md)
- [Agent Coordination Patterns](./dhrit/guides/project-coordination.md)
- [Development Workflow](./dhrit/guides/development-workflow.md)

## 🏗️ Architecture

### 8-Agent Coordination Flow
```mermaid
graph TD
    A[User Requirements] --> B[Pal - Architecture]
    B --> C[Kalp - Design System]
    B --> D[Bandh - Security Planning]
    
    C --> E[Kosh - Database Design]
    D --> E
    B --> E
    
    E --> F[Mool - Backend APIs]
    C --> F
    D --> F
    
    F --> G[Roop - Frontend UI]
    C --> G
    
    G --> H[Gati - Performance Optimization]
    F --> H
    E --> H
    
    H --> I[Dhar - Testing & Deployment]
    G --> I
    F --> I
    E --> I
    
    I --> J[Production Application]
```

### Agent Communication Protocols
- **Sequential Handoff**: Dependencies where one agent must complete before another starts
- **Parallel Coordination**: Independent work that needs synchronization points
- **Feedback Loop**: Iterative improvement and optimization
- **Quality Gates**: Automatic blocking when quality issues detected
- **Conflict Resolution**: Architecture-led decision making

## 🔧 Configuration

### Redis Configuration
```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

### PostgreSQL/Supabase Configuration
```env
# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/dhrit_platform

# Or Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### MCP Server Configuration
The platform uses MCP (Model Context Protocol) integration with Q CLI. Configuration is automatically set up in `~/.config/q/mcp_servers.json`.

## 🚧 Development Roadmap

### Phase 1: Core Platform (✅ Complete)
- ✅ 8-agent coordination system
- ✅ Redis/PostgreSQL infrastructure
- ✅ Component libraries
- ✅ Training system
- ✅ Agent-to-agent communication
- ✅ Project management and tracking

### Phase 2: Advanced Coordination (🔄 In Progress)
- 🔄 Autonomous Linker agent for full automation
- 🔄 Web UI for non-technical users
- 🔄 Advanced conflict resolution
- 🔄 Performance monitoring and optimization

### Phase 3: Enterprise Features (⏳ Planned)
- ⏳ Multi-tenancy support
- ⏳ Team collaboration features
- ⏳ Advanced analytics and reporting
- ⏳ Industry-specific agent specializations
- ⏳ Custom enterprise integrations

## 🤝 Contributing

This is a Next.js project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Agent Development
1. **Domain Training**: Add expertise to agents in `dhrit/training/domains/`
2. **Protocol Training**: Update coordination patterns in `dhrit/training/protocols/`
3. **Library Development**: Add reusable components in `dhrit/libraries/`
4. **Testing**: Test agent coordination with real projects

## 📄 License

This project is part of the Isha Gramotsavam initiative.

---

## 🎉 Success Stories

### Example: TaskMaster App
**Built entirely by coordinated AI agents:**
- **Architecture**: Scalable microservices design by Pal
- **Design**: Professional UI/UX system by Kalp
- **Security**: Comprehensive security architecture by Bandh
- **Database**: Optimized PostgreSQL schema by Kosh
- **Backend**: Type-safe tRPC APIs by Mool
- **Frontend**: React interface with real-time features by Roop
- **Performance**: Sub-second load times achieved by Gati
- **Deployment**: Live on Vercel with monitoring by Dhar

**Result**: Production-ready task management application deployed in under 2 hours with full agent coordination.

---

**Dhrit Platform: Where AI agents collaborate to build the future of software development! 🚀**
