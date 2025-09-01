# Isha Gramotsavam - Multi-Agent Development Platform

A production-ready platform that uses specialized AI agents to build enterprise-grade full-stack applications automatically.

## 🤖 Agent Architecture

### Specialized Agents
- **Frontend Developer**: Next.js 15+, React 19+, Tailwind CSS, AWS Amplify
- **Backend Developer**: tRPC, Prisma, Node.js, Authentication, APIs
- **Database Admin**: Prisma, PostgreSQL, Schema Design, Performance
- **QA & DevOps**: Testing, CI/CD, Deployment, Monitoring

### Agent Coordination
- **Message Queue System**: Redis-based agent communication
- **State Machine**: Project progression through development stages
- **Protocol Training**: Agents trained on coordination standards
- **Component Libraries**: Reusable code across projects

## 🚀 Quick Start

### 1. Train All Agents
```bash
# Train agents with domain knowledge and coordination protocols
agents___train-all-agents
```

### 2. Initialize Project
```bash
# Create new project with requirements
agents___project-init --projectId "my-app" --requirements "Build a user authentication system with dashboard"
```

### 3. Execute Full Development
```bash
# Coordinate all agents to build complete application
agents___execute-full-project --projectId "my-app" --requirements "E-commerce platform with user management"
```

### 4. Individual Agent Tasks
```bash
# Database design
agents___database-admin --projectId "my-app" --task "Create user schema" --requirements "Users with roles and permissions"

# Backend API
agents___backend-developer --projectId "my-app" --task "Create auth API" --requirements "JWT authentication with tRPC"

# Frontend UI
agents___frontend-developer --projectId "my-app" --task "Build login form" --requirements "Responsive form with validation"

# Testing & Deployment
agents___qa-devops --projectId "my-app" --task "Setup CI/CD" --requirements "Automated testing and deployment"
```

## 📁 Project Structure

```
agents/
├── mcp-server/           # MCP server for Q CLI integration
├── protocols/            # Message queue and state machine
├── training/             # Agent domain and protocol training
├── libraries/            # Reusable components per agent
│   ├── frontend/         # React components, hooks, utils
│   ├── backend/          # tRPC routers, middleware, utils
│   ├── database/         # Prisma schemas, migrations, queries
│   └── qa/              # Test suites, configs, templates
├── state/               # Project state and coordination
└── guides/              # Documentation and guides
```

## 🎯 Features

### Current Capabilities
- ✅ Real Q Developer agent integration (`q /agent`)
- ✅ Domain-specific agent training
- ✅ Protocol-based coordination
- ✅ Component library system
- ✅ Message queue communication
- ✅ Project state management
- ✅ Full-stack code generation

### Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, AWS Amplify
- **Backend**: tRPC, Prisma, Node.js, PostgreSQL
- **Testing**: Jest, Playwright, Testing Library
- **Infrastructure**: Redis, Supabase, Docker, CI/CD

## 📚 Documentation

See the [guides/](./agents/guides/) directory for detailed documentation:

- [Agent Training Guide](./agents/guides/agent-training.md)
- [Project Coordination Guide](./agents/guides/project-coordination.md)
- [Component Libraries Guide](./agents/guides/component-libraries.md)
- [MCP Integration Guide](./agents/guides/mcp-integration.md)
- [Development Workflow Guide](./agents/guides/development-workflow.md)

## 🏗️ Architecture

### Agent Communication Flow
1. **Linker** (User) provides requirements
2. **Project State** tracks development stages
3. **Message Queue** coordinates agent tasks
4. **Agents** process specialized tasks
5. **Libraries** provide reusable components
6. **Coordination** ensures proper handoffs

### Development Stages
```
Requirements → Database Design → Backend APIs → Frontend UI → Testing → Deployment
```

## 🔧 Configuration

The platform uses MCP (Model Context Protocol) integration with Q CLI. Configuration is automatically set up in `~/.config/q/mcp_servers.json`.

## 🚧 Enterprise Roadmap

### Phase 1: Foundation (Current)
- ✅ Agent coordination system
- ✅ Component libraries
- ✅ Basic training system

### Phase 2: Quality & Scale
- 🔄 Design system agent
- 🔄 Visual testing capabilities
- 🔄 Performance optimization
- 🔄 Redis/Supabase integration

### Phase 3: Enterprise Features
- ⏳ Security and compliance
- ⏳ Multi-tenancy support
- ⏳ Advanced monitoring
- ⏳ Auto-scaling infrastructure

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
