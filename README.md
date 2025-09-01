# Isha Gramotsavam - Dhrit Platform

**Dhrit** - A production-ready multi-agent development platform that uses 8 specialized AI agents to build enterprise-grade full-stack applications automatically.

## 🤖 Dhrit Agent Architecture

### Core Agents (4)
- **Roop** (रूप) - Frontend Developer: Next.js 15+, React 19+, Tailwind CSS, AWS Amplify
- **Mool** (मूल) - Backend Developer: tRPC, Prisma, Node.js, Authentication, APIs
- **Kosh** (कोश) - Database Admin: Prisma, PostgreSQL, Schema Design, Performance
- **Dhar** (धार) - QA & DevOps: Testing, CI/CD, Deployment, Monitoring

### Enterprise Agents (4)
- **Kalp** (कल्प) - Design System: Design tokens, component systems, brand identity
- **Bandh** (बंध) - Security: Security audits, compliance, vulnerability scanning
- **Gati** (गति) - Performance: Optimization, caching, load testing
- **Pal** (पाल) - Architecture: Microservices, system design, scalability patterns

### Agent Coordination
- **Redis-based coordination**: Real-time agent communication and task queues
- **PostgreSQL persistence**: Project state, agent libraries, performance tracking
- **Protocol training**: Agents trained on coordination standards
- **Component libraries**: Reusable code across projects

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Copy environment configuration
cp dhrit/.env.example dhrit/.env

# Configure Redis and PostgreSQL URLs in .env file
# Install dependencies
cd dhrit && npm install
```

### 2. Train All Agents
```bash
# Train all 8 agents with domain knowledge and coordination protocols
dhrit___train-all-agents
```

### 3. Initialize Project
```bash
# Create new project with requirements
dhrit___init --projectId "my-app" --requirements "Build a user authentication system with dashboard"
```

### 4. Execute Full Development
```bash
# Coordinate all 8 agents to build complete application
dhrit___build --projectId "my-app" --requirements "E-commerce platform with user management"
```

### 5. Individual Agent Tasks
```bash
# Architecture design
dhrit___pal --projectId "my-app" --task "Design system architecture" --requirements "Scalable e-commerce architecture"

# Design system
dhrit___kalp --projectId "my-app" --task "Create design system" --requirements "Modern e-commerce brand identity"

# Security planning
dhrit___bandh --projectId "my-app" --task "Security audit" --requirements "E-commerce security and compliance"

# Database design
dhrit___kosh --projectId "my-app" --task "Create user schema" --requirements "Users with roles and permissions"

# Backend API
dhrit___mool --projectId "my-app" --task "Create auth API" --requirements "JWT authentication with tRPC"

# Frontend UI
dhrit___roop --projectId "my-app" --task "Build login form" --requirements "Responsive form with validation"

# Performance optimization
dhrit___gati --projectId "my-app" --task "Optimize performance" --requirements "Sub-second load times"

# Testing & Deployment
dhrit___dhar --projectId "my-app" --task "Setup CI/CD" --requirements "Automated testing and deployment"
```

## 📁 Project Structure

```
dhrit/
├── mcp-server/           # MCP server for Q CLI integration
│   ├── server.js         # Main MCP server with 8 agents
│   ├── redis-manager.js  # Redis coordination layer
│   ├── database-manager.js # PostgreSQL/Supabase persistence
│   ├── agent-coordinator.js # 8-agent workflow orchestration
│   └── q-agent-executor.js # Q Developer agent execution
├── training/             # Agent domain and protocol training
│   ├── domain-trainer.js # 8-agent domain training
│   └── protocol-trainer.js # 8-agent coordination protocols
├── libraries/            # Reusable components per agent
│   ├── frontend/         # Roop's React components, hooks, utils
│   ├── backend/          # Mool's tRPC routers, middleware, utils
│   ├── database/         # Kosh's Prisma schemas, migrations, queries
│   └── qa/              # Dhar's test suites, configs, templates
├── guides/              # Documentation and guides
└── .env.example         # Environment configuration template
```

## 🎯 Features

### Current Capabilities (MVP - 60% Enterprise)
- ✅ 8 specialized AI agents (4 core + 4 enterprise)
- ✅ Redis-based agent coordination
- ✅ PostgreSQL/Supabase persistence
- ✅ Real Q Developer agent integration (`q /agent`)
- ✅ Domain-specific agent training
- ✅ Protocol-based coordination
- ✅ Component library system
- ✅ Full-stack code generation

### Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, AWS Amplify
- **Backend**: tRPC, Prisma, Node.js, PostgreSQL
- **Testing**: Jest, Playwright, Testing Library
- **Infrastructure**: Redis, Supabase, Docker, CI/CD
- **Coordination**: Redis Streams, PostgreSQL, MCP Protocol

## 📚 Documentation

See the [dhrit/guides/](./dhrit/guides/) directory for detailed documentation:

- [Agent Training Guide](./dhrit/guides/agent-training.md)
- [Project Coordination Guide](./dhrit/guides/project-coordination.md)
- [Component Libraries Guide](./dhrit/guides/component-libraries.md)
- [MCP Integration Guide](./dhrit/guides/mcp-integration.md)
- [Development Workflow Guide](./dhrit/guides/development-workflow.md)

## 🏗️ Architecture

### 8-Agent Coordination Flow
1. **User** provides requirements
2. **Pal** designs system architecture
3. **Kalp** creates design system
4. **Bandh** plans security architecture
5. **Kosh** designs database schema
6. **Mool** develops backend APIs
7. **Roop** builds frontend UI
8. **Gati** optimizes performance
9. **Dhar** tests and deploys

### Development Stages
```
Requirements → Architecture → Design → Security → Database → Backend → Frontend → Performance → Testing → Deployment
```

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

The platform uses MCP (Model Context Protocol) integration with Q CLI. Configuration is automatically set up in `~/.config/q/mcp_servers.json`.

## 🚧 Enterprise Roadmap

### Phase 1: MVP Foundation (Current - 60% Enterprise)
- ✅ 8-agent coordination system
- ✅ Redis/PostgreSQL infrastructure
- ✅ Component libraries
- ✅ Basic training system

### Phase 2: Advanced Enterprise (90% Enterprise)
- 🔄 Integration agent (APIs, webhooks)
- 🔄 Compliance agent (GDPR, SOC2)
- 🔄 Monitoring agent (Observability)
- 🔄 Mobile agent (React Native)

### Phase 3: Full Enterprise (100% Enterprise)
- ⏳ Multi-tenancy support
- ⏳ Advanced analytics
- ⏳ Industry-specific agents
- ⏳ Custom enterprise features

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

## 📄 License

This project is part of the Isha Gramotsavam initiative.
