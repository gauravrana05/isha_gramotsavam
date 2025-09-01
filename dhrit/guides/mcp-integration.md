# MCP Integration Guide

This guide explains how the Multi-Agent Development Platform integrates with Q CLI through the Model Context Protocol (MCP).

## Overview

The platform uses MCP (Model Context Protocol) to provide agent tools directly in your Q CLI session, enabling seamless interaction with specialized AI agents.

## MCP Server Architecture

### Server Location
- **Path**: `agents/mcp-server/server.js`
- **Type**: Node.js MCP server
- **Protocol**: Stdio transport for Q CLI communication

### Configuration
The MCP server is automatically configured in:
```json
// ~/.config/q/mcp_servers.json
{
  "agents": {
    "command": "node",
    "args": ["/path/to/agents/mcp-server/server.js"]
  }
}
```

## Available Tools

### Project Management
```bash
# Initialize new project
agents___project-init --projectId "my-app" --requirements "Build a blog platform"

# Check project status
agents___project-status --projectId "my-app"

# Execute full project with all agents
agents___execute-full-project --projectId "my-app" --requirements "Complete blog with auth"
```

### Agent Training
```bash
# Train individual agent with domain knowledge
agents___train-domain --agentName "frontend-developer"

# Train agent with coordination protocols
agents___train-protocol --agentName "frontend-developer"

# Train all agents (domain + protocol)
agents___train-all-agents
```

### Individual Agents
```bash
# Frontend development tasks
agents___frontend-developer --projectId "my-app" --task "Create blog post form" --requirements "React form with rich text editor"

# Backend development tasks
agents___backend-developer --projectId "my-app" --task "Create blog API" --requirements "tRPC router for blog CRUD operations"

# Database administration tasks
agents___database-admin --projectId "my-app" --task "Design blog schema" --requirements "Posts, authors, comments, tags"

# QA and DevOps tasks
agents___qa-devops --projectId "my-app" --task "Setup testing" --requirements "Unit and E2E tests for blog functionality"
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
| `frontend-developer` | `q /agent frontend` | React, Next.js, Tailwind, Amplify |
| `backend-developer` | `q /agent backend` | tRPC, APIs, Authentication |
| `database-admin` | `q /agent database` | Prisma, PostgreSQL, Schema Design |
| `qa-devops` | `q /agent devops` | Testing, CI/CD, Deployment |

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

### Project State
- **Location**: `agents/state/{projectId}/project-state.json`
- **Content**: Current stage, completed stages, outputs, blockers
- **Updates**: Automatic progression through development stages

### Message Queue
- **Location**: `agents/state/{projectId}/messages/`
- **Format**: Individual JSON files per message
- **Tracking**: Task assignment, progress, and completion

## Error Handling

### Common Issues

**Agent Not Found**:
```bash
Error: Agent frontend failed: Command 'q' not found
```
**Solution**: Ensure Q CLI is installed and in PATH

**Training Required**:
```bash
Error: Agent not trained on coordination protocols
```
**Solution**: Run `agents___train-all-agents` first

**Project Not Found**:
```bash
Error: No project found with ID: my-app
```
**Solution**: Initialize project with `agents___project-init`

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

## Best Practices

### Tool Usage
1. **Initialize First**: Always run `project-init` before other tools
2. **Train Agents**: Run `train-all-agents` before first use
3. **Check Status**: Use `project-status` to monitor progress
4. **Sequential Tasks**: Follow dependency order for agent tasks

### Error Recovery
1. **Check Prerequisites**: Ensure Q CLI and agents are available
2. **Verify Training**: Confirm agents are trained
3. **Clean State**: Remove corrupted project state if needed
4. **Retry Operations**: Most operations are idempotent

### Performance
1. **Batch Operations**: Use `execute-full-project` for complete workflows
2. **Parallel Tasks**: Independent tasks can run simultaneously
3. **State Cleanup**: Remove old project states periodically
4. **Resource Monitoring**: Monitor system resources during execution

## Troubleshooting

### MCP Server Issues
- **Server Not Starting**: Check Node.js installation and file permissions
- **Tools Not Available**: Verify MCP configuration in Q CLI
- **Connection Errors**: Restart Q CLI session

### Agent Communication
- **Timeout Errors**: Increase timeout for complex tasks
- **Protocol Errors**: Ensure all agents are protocol-trained
- **State Corruption**: Reset project state and reinitialize

### Q CLI Integration
- **Command Not Found**: Verify Q CLI installation
- **Permission Denied**: Check file permissions for MCP server
- **Configuration Issues**: Verify `mcp_servers.json` configuration
