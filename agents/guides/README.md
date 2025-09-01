# Multi-Agent Development Platform - Guides

Comprehensive documentation for using the Multi-Agent Development Platform to build enterprise-grade applications.

## 📚 Available Guides

### [Agent Training Guide](./agent-training.md)
Learn how to train specialized AI agents with domain knowledge and coordination protocols.
- Domain-specific training for each agent type
- Protocol training for agent coordination
- Training commands and best practices
- Troubleshooting training issues

### [Project Coordination Guide](./project-coordination.md)
Understand how agents coordinate to build complete applications through structured workflows.
- Message queue system and state machine
- Development workflow stages
- Agent dependencies and handoffs
- Coordination commands and monitoring

### [Component Libraries Guide](./component-libraries.md)
Explore how agents use and build reusable component libraries to accelerate development.
- Library structure for each agent type
- Component reuse and customization
- Building libraries over time
- Best practices for library management

### [MCP Integration Guide](./mcp-integration.md)
Technical details on how the platform integrates with Q CLI through Model Context Protocol.
- MCP server architecture and configuration
- Available tools and parameters
- Q /agent integration details
- Error handling and troubleshooting

### [Development Workflow Guide](./development-workflow.md)
Step-by-step workflows for building different types of applications.
- Quick start workflow
- Manual step-by-step process
- Specialized workflows (e-commerce, SaaS, etc.)
- Iterative development and refinement

## 🚀 Getting Started

1. **Start Here**: [Development Workflow Guide](./development-workflow.md) - Quick start and common workflows
2. **Train Agents**: [Agent Training Guide](./agent-training.md) - Essential first step
3. **Understand Coordination**: [Project Coordination Guide](./project-coordination.md) - How agents work together
4. **Leverage Libraries**: [Component Libraries Guide](./component-libraries.md) - Reuse and build components
5. **Technical Details**: [MCP Integration Guide](./mcp-integration.md) - Deep dive into implementation

## 🎯 Quick Reference

### Essential Commands
```bash
# Train all agents (first time setup)
agents___train-all-agents

# Initialize new project
agents___project-init --projectId "my-app" --requirements "Your app description"

# Build complete application
agents___execute-full-project --projectId "my-app" --requirements "Detailed requirements"

# Check project status
agents___project-status --projectId "my-app"
```

### Agent Specializations
- **Frontend Developer**: Next.js, React, Tailwind CSS, AWS Amplify
- **Backend Developer**: tRPC, Prisma, Node.js, Authentication
- **Database Admin**: Prisma, PostgreSQL, Schema Design, Performance
- **QA & DevOps**: Testing, CI/CD, Deployment, Monitoring

### Development Stages
```
Requirements → Database Design → Backend APIs → Frontend UI → Testing → Deployment
```

## 🔧 Support

### Common Issues
- **Training Problems**: See [Agent Training Guide](./agent-training.md#troubleshooting)
- **Coordination Issues**: See [Project Coordination Guide](./project-coordination.md#troubleshooting)
- **MCP Problems**: See [MCP Integration Guide](./mcp-integration.md#troubleshooting)
- **Workflow Issues**: See [Development Workflow Guide](./development-workflow.md#troubleshooting-workflows)

### Best Practices
1. Always train agents before first use
2. Provide clear, detailed requirements
3. Follow dependency order in manual workflows
4. Monitor project status between phases
5. Use component libraries for consistency

## 📈 Advanced Topics

### Enterprise Features (Planned)
- Multi-tenancy support
- Advanced security and compliance
- Performance optimization
- Scalability patterns
- Monitoring and observability

### Platform Extensions
- Custom agent types
- Integration with external services
- Advanced workflow patterns
- Component sharing across projects
- Automated testing and deployment

## 🤝 Contributing

To contribute to the documentation:
1. Follow the existing guide structure
2. Include practical examples and code snippets
3. Provide troubleshooting sections
4. Update this index when adding new guides
5. Test all commands and workflows before documenting
