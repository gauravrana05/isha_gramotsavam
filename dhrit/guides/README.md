# Dhrit Platform - Guides

Comprehensive documentation for using the Dhrit Platform to build enterprise-grade applications with 8 specialized AI agents.

## 📚 Available Guides

### [Agent Training Guide](./agent-training.md)
Learn how to train the 8 specialized AI agents with domain knowledge and coordination protocols.
- Domain-specific training for each agent type (Core + Enterprise)
- Protocol training for 8-agent coordination
- Training commands and best practices
- Troubleshooting training issues

### [Project Coordination Guide](./project-coordination.md)
Understand how the 8 agents coordinate to build complete applications through structured workflows.
- Redis-based message queue system and PostgreSQL state management
- 10-stage development workflow with 8-agent coordination
- Agent dependencies and handoffs
- Coordination commands and monitoring

### [Component Libraries Guide](./component-libraries.md)
Explore how agents use and build reusable component libraries to accelerate development.
- Library structure for each of the 8 agent types
- Component reuse and customization strategies
- Building libraries over time with agent learning
- Best practices for library management

### [MCP Integration Guide](./mcp-integration.md)
Technical details on how the Dhrit platform integrates with Q CLI through Model Context Protocol.
- MCP server architecture with Redis and PostgreSQL
- Available tools for all 8 agents and project management
- Q /agent integration details and mapping
- Infrastructure integration and error handling

### [Development Workflow Guide](./development-workflow.md)
Step-by-step workflows for building different types of applications with 8-agent coordination.
- Quick start workflow with automated 8-agent coordination
- Manual step-by-step process with individual agent control
- Specialized workflows (e-commerce, SaaS, enterprise applications)
- Iterative development and refinement patterns

## 🚀 Getting Started

1. **Start Here**: [Development Workflow Guide](./development-workflow.md) - Quick start and common workflows
2. **Train Agents**: [Agent Training Guide](./agent-training.md) - Essential first step for all 8 agents
3. **Understand Coordination**: [Project Coordination Guide](./project-coordination.md) - How 8 agents work together
4. **Leverage Libraries**: [Component Libraries Guide](./component-libraries.md) - Reuse and build components
5. **Technical Details**: [MCP Integration Guide](./mcp-integration.md) - Deep dive into implementation

## 🎯 Quick Reference

### Essential Commands
```bash
# Train all 8 agents (first time setup)
dhrit___train-all-agents

# Initialize new project
dhrit___init --projectId "my-app" --requirements "Your app description"

# Build complete application with 8-agent coordination
dhrit___build --projectId "my-app" --requirements "Detailed requirements"

# Check project status
dhrit___status --projectId "my-app"
```

### 8-Agent Specializations

#### Core Agents (4)
- **Roop** (रूप) - Frontend Developer: Next.js, React, Tailwind CSS, AWS Amplify
- **Mool** (मूल) - Backend Developer: tRPC, Prisma, Node.js, Authentication
- **Kosh** (कोश) - Database Admin: Prisma, PostgreSQL, Schema Design, Performance
- **Dhar** (धार) - QA & DevOps: Testing, CI/CD, Deployment, Monitoring

#### Enterprise Agents (4)
- **Kalp** (कल्प) - Design System: Design tokens, component systems, brand identity
- **Bandh** (बंध) - Security: Security audits, compliance, vulnerability scanning
- **Gati** (गति) - Performance: Optimization, caching, load testing
- **Pal** (पाल) - Architecture: Microservices, system design, scalability patterns

### Development Stages (10-Stage Workflow)
```
Requirements → Architecture → Design → Security → Database → Backend → Frontend → Performance → Testing → Deployment
```

### Individual Agent Commands
```bash
# Core Agents
dhrit___roop --projectId "my-app" --task "Build UI" --requirements "User interface requirements"
dhrit___mool --projectId "my-app" --task "Create API" --requirements "Backend API requirements"
dhrit___kosh --projectId "my-app" --task "Design schema" --requirements "Database requirements"
dhrit___dhar --projectId "my-app" --task "Test & deploy" --requirements "Testing requirements"

# Enterprise Agents
dhrit___kalp --projectId "my-app" --task "Design system" --requirements "Design requirements"
dhrit___bandh --projectId "my-app" --task "Security audit" --requirements "Security requirements"
dhrit___gati --projectId "my-app" --task "Optimize performance" --requirements "Performance requirements"
dhrit___pal --projectId "my-app" --task "System architecture" --requirements "Architecture requirements"
```

## 🔧 Infrastructure

### Redis Coordination
- Real-time agent message queues
- Project state coordination
- Agent status tracking
- Performance monitoring

### PostgreSQL Persistence
- Long-term project storage
- Agent component libraries
- Training records and results
- Performance analytics

## 🔧 Support

### Common Issues
- **Training Problems**: See [Agent Training Guide](./agent-training.md#troubleshooting)
- **Coordination Issues**: See [Project Coordination Guide](./project-coordination.md#troubleshooting)
- **MCP Problems**: See [MCP Integration Guide](./mcp-integration.md#troubleshooting)
- **Workflow Issues**: See [Development Workflow Guide](./development-workflow.md#troubleshooting-workflows)

### Best Practices
1. Always train all 8 agents before first use
2. Provide clear, detailed requirements for each agent
3. Follow dependency order in manual workflows (Architecture → Design → Security → Database → Backend → Frontend → Performance → Testing)
4. Monitor project status between phases
5. Use component libraries for consistency and speed

## 📈 Advanced Topics

### Enterprise Features (Current - 60% Enterprise)
- 8-agent coordination system
- Redis/PostgreSQL infrastructure
- Component libraries with agent learning
- Security and performance optimization
- Design system integration

### Platform Extensions (Planned)
- Integration agent for APIs and webhooks
- Compliance agent for GDPR and SOC2
- Monitoring agent for observability
- Mobile agent for React Native
- Advanced multi-tenancy support

### Workflow Patterns
- Sequential 8-agent coordination
- Parallel execution where possible
- Iterative refinement with specific agents
- Feature addition with coordinated agents
- Performance optimization across all layers

## 🤝 Contributing

To contribute to the documentation:
1. Follow the existing guide structure and Dhrit branding
2. Include practical examples with 8-agent coordination
3. Provide troubleshooting sections for each feature
4. Update this index when adding new guides
5. Test all commands and workflows with the 8-agent system
6. Ensure Redis and PostgreSQL integration examples are included
