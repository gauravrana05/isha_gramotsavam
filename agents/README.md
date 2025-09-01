# Multi-Agent Development System with Q /agent

A system of specialized AI agents powered by **Q Developer's /agent command** that work together to build web applications using Next.js, tRPC, and Prisma.

## Architecture

### Q /agent Integration
Each agent uses Q Developer's **purpose-built /agent command**:

- **Frontend Developer**: `q /agent frontend` - Specialized for React, Next.js, Tailwind CSS
- **Backend Developer**: `q /agent backend` - Specialized for tRPC, APIs, business logic  
- **Database Admin**: `q /agent database` - Specialized for Prisma, PostgreSQL, schema design
- **QA & DevOps**: `q /agent devops` - Specialized for testing, CI/CD, deployment

### Key Advantages of /agent
✅ **Built-in Agent Context**: Each agent has specialized knowledge and memory
✅ **Optimized Behavior**: Purpose-built for specific development roles
✅ **Enhanced Capabilities**: Access to agent-specific tools and workflows
✅ **Better Task Understanding**: Agents understand their domain deeply
✅ **Persistent State**: Agents remember context across interactions

## How It Works

1. **MCP server spawns Q /agent processes** → `spawn('q', ['/agent', 'frontend'])`
2. **Agent gets specialized context** → Built-in role-specific knowledge
3. **Task sent directly to agent** → No system prompts needed
4. **Agent processes with domain expertise** → Optimized for specific tasks
5. **Returns specialized output** → Role-appropriate solutions

## Usage

### Individual Agents
```bash
# Frontend agent (uses q /agent frontend)
agents___frontend-developer --projectId "my-app" --task "Create login form" --requirements "React form with email/password validation"

# Backend agent (uses q /agent backend)
agents___backend-developer --projectId "my-app" --task "Create auth API" --requirements "tRPC endpoints for user authentication"

# Database agent (uses q /agent database)
agents___database-admin --projectId "my-app" --task "Design user schema" --requirements "User model with authentication fields"

# DevOps agent (uses q /agent devops)
agents___qa-devops --projectId "my-app" --task "Setup testing" --requirements "Unit tests for auth components"
```

### Coordinated Execution
```bash
# Execute all agents in sequence with dependencies
agents___execute-full-project --projectId "my-app" --requirements "Build a blog with user authentication and post management"
```

## Agent Mapping

| MCP Tool Name | Q /agent Command | Specialization |
|---------------|------------------|----------------|
| `frontend-developer` | `q /agent frontend` | React, Next.js, Tailwind, UI/UX |
| `backend-developer` | `q /agent backend` | tRPC, APIs, Authentication, Business Logic |
| `database-admin` | `q /agent database` | Prisma, PostgreSQL, Schema Design, Optimization |
| `qa-devops` | `q /agent devops` | Testing, CI/CD, Deployment, Monitoring |

## Benefits Over Generic Chat

**Previous (q chat):**
- ❌ Generic Q Developer + system prompts
- ❌ Limited specialization
- ❌ No persistent agent context

**Current (q /agent):**
- ✅ Purpose-built agent specialization
- ✅ Built-in domain expertise
- ✅ Optimized workflows for each role
- ✅ Enhanced task understanding
- ✅ Better coordination capabilities

## Project Structure
```
agents/
├── mcp-server/
│   ├── server.js              # MCP server with Q /agent integration
│   ├── q-agent-executor.js    # Spawns q /agent processes
│   └── agent-coordinator.js   # Coordinates multi-agent execution
├── protocols/                 # Message queue and state management
└── state/                     # Project state and agent communication
```

The system now leverages Q Developer's specialized /agent command for maximum effectiveness in each development domain.
