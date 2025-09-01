# MCP Integration Guide

This guide explains how the Dhrit Platform integrates with Q CLI through the Model Context Protocol (MCP).

## Overview

The Dhrit platform uses MCP (Model Context Protocol) to provide 8 specialized agent tools directly in your Q CLI session, enabling seamless interaction with AI agents.

## MCP Server Architecture

### Server Location
- **Path**: `dhrit/mcp-server/server.js`
- **Type**: Node.js MCP server with Redis and PostgreSQL integration
- **Protocol**: Stdio transport for Q CLI communication

### Configuration
The MCP server is automatically configured in:
```json
// ~/.config/q/mcp_servers.json
{
  "dhrit": {
    "command": "node",
    "args": ["/path/to/dhrit/mcp-server/server.js"]
  }
}
```

## Available Tools

### Core Agents
```bash
# Frontend development tasks
dhrit___roop --projectId "my-app" --task "Create blog post form" --requirements "React form with rich text editor"

# Backend development tasks
dhrit___mool --projectId "my-app" --task "Create blog API" --requirements "tRPC router for blog CRUD operations"

# Database administration tasks
dhrit___kosh --projectId "my-app" --task "Design blog schema" --requirements "Posts, authors, comments, tags"

# QA and DevOps tasks
dhrit___dhar --projectId "my-app" --task "Setup testing" --requirements "Unit and E2E tests for blog functionality"
```

### Enterprise Agents
```bash
# Design system tasks
dhrit___kalp --projectId "my-app" --task "Create design system" --requirements "Modern blog design tokens and components"

# Security tasks
dhrit___bandh --projectId "my-app" --task "Security audit" --requirements "Blog security and user data protection"

# Performance tasks
dhrit___gati --projectId "my-app" --task "Optimize performance" --requirements "Fast blog loading and search"

# Architecture tasks
dhrit___pal --projectId "my-app" --task "Design architecture" --requirements "Scalable blog platform architecture"
```

### Project Management
```bash
# Initialize new project
dhrit___init --projectId "my-app" --requirements "Build a blog platform"

# Check project status
dhrit___status --projectId "my-app"

# Execute full project with all 8 agents
dhrit___build --projectId "my-app" --requirements "Complete blog with auth"
```

### Agent Training
```bash
# Train individual agent with domain knowledge
dhrit___train-domain --agentName "roop"

# Train agent with coordination protocols
dhrit___train-protocol --agentName "roop"

# Train all 8 agents (domain + protocol)
dhrit___train-all-agents
```

## Q /agent Integration

### Agent Execution
The MCP server spawns real Q Developer agents using the `/agent` command:

```javascript
// Internal implementation
const qProcess = spawn('q', ['/agent', 'frontend'], {
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Agent Mapping
| MCP Tool | Q /agent Command | Specialization |
|----------|------------------|----------------|
| `roop` | `q /agent frontend` | React, Next.js, Tailwind, Amplify |
| `mool` | `q /agent backend` | tRPC, APIs, Authentication |
| `kosh` | `q /agent database` | Prisma, PostgreSQL, Schema Design |
| `dhar` | `q /agent devops` | Testing, CI/CD, Deployment |
| `kalp` | `q /agent design` | Design Systems, UI/UX |
| `bandh` | `q /agent security` | Security, Compliance |
| `gati` | `q /agent performance` | Optimization, Caching |
| `pal` | `q /agent architecture` | System Architecture, Scalability |

## Infrastructure Integration

### Redis Coordination
- **Real-time messaging**: Agent task coordination
- **State management**: Project progress tracking
- **Performance monitoring**: Agent execution metrics
- **Caching**: Component library caching

### PostgreSQL Persistence
- **Project storage**: Long-term project data
- **Agent libraries**: Reusable component storage
- **Performance tracking**: Agent execution history
- **Training records**: Agent training results

## Tool Parameters

### Common Parameters
- **projectId**: Unique identifier for the project
- **task**: Specific task description
- **requirements**: Detailed requirements for the task

### Project Context
Each agent receives:
- Current project stage
- Dependencies from other agents
- Previous agent outputs
- Project-specific requirements

## Response Format

### Successful Response
```json
{
  "content": [{
    "type": "text",
    "text": "Agent response with generated code, explanations, and next steps"
  }]
}
```

### Error Response
```json
{
  "content": [{
    "type": "text", 
    "text": "Error description and troubleshooting information"
  }],
  "isError": true
}
```

## State Management

### Redis State
- **Location**: Redis streams and keys
- **Content**: Real-time coordination, message queues, locks
- **Updates**: Automatic coordination and status updates

### PostgreSQL State
- **Location**: PostgreSQL/Supabase tables
- **Content**: Persistent project data, agent libraries, performance metrics
- **Updates**: Long-term storage and historical tracking

## Error Handling

### Common Issues

**Agent Not Found**:
```bash
Error: Agent roop failed: Command 'q' not found
```
**Solution**: Ensure Q CLI is installed and in PATH

**Training Required**:
```bash
Error: Agent not trained on coordination protocols
```
**Solution**: Run `dhrit___train-all-agents` first

**Project Not Found**:
```bash
Error: No project found with ID: my-app
```
**Solution**: Initialize project with `dhrit___init`

**Database Connection**:
```bash
Error: Failed to connect to Redis/PostgreSQL
```
**Solution**: Check Redis and PostgreSQL configuration in `.env`

### Debugging

**Enable Verbose Logging**:
```javascript
// In mcp-server/server.js
console.log('Agent execution:', { agentName, task, requirements });
```

**Check Agent Output**:
```bash
# Manual agent test
q /agent frontend
```

**Check Infrastructure**:
```bash
# Test Redis connection
redis-cli ping

# Test PostgreSQL connection
psql -h localhost -U username -d dhrit_platform
```

## Best Practices

### Tool Usage
1. **Initialize First**: Always run `dhrit___init` before other tools
2. **Train Agents**: Run `dhrit___train-all-agents` before first use
3. **Check Status**: Use `dhrit___status` to monitor progress
4. **Sequential Tasks**: Follow dependency order for agent tasks

### Error Recovery
1. **Check Prerequisites**: Ensure Q CLI and infrastructure are available
2. **Verify Training**: Confirm agents are trained
3. **Clean State**: Remove corrupted project state if needed
4. **Retry Operations**: Most operations are idempotent

### Performance
1. **Batch Operations**: Use `dhrit___build` for complete workflows
2. **Parallel Tasks**: Independent tasks can run simultaneously
3. **State Cleanup**: Remove old project states periodically
4. **Resource Monitoring**: Monitor Redis and PostgreSQL resources

## Troubleshooting

### MCP Server Issues
- **Server Not Starting**: Check Node.js installation and dependencies
- **Tools Not Available**: Verify MCP configuration in Q CLI
- **Connection Errors**: Restart Q CLI session

### Agent Communication
- **Timeout Errors**: Increase timeout for complex tasks
- **Protocol Errors**: Ensure all agents are protocol-trained
- **State Corruption**: Reset project state and reinitialize

### Infrastructure Issues
- **Redis Connection**: Check Redis server and configuration
- **PostgreSQL Connection**: Verify database server and credentials
- **Performance Issues**: Monitor resource usage and optimize queries
