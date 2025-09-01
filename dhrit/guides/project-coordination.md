# Project Coordination Guide

This guide explains how agents coordinate to build complete applications through structured workflows.

## Coordination Architecture

### Message Queue System
- **Location**: `agents/state/{projectId}/messages/`
- **Format**: Structured JSON messages with task details
- **Status Tracking**: pending → in-progress → completed → failed

### State Machine
- **Location**: `agents/state/{projectId}/project-state.json`
- **Stages**: requirements → design → database → backend → frontend → testing → deployment
- **Transitions**: Automatic progression based on agent completion

## Development Workflow

### 1. Project Initialization
```bash
agents___project-init --projectId "my-app" --requirements "Build a user authentication system"
```

**Creates**:
- Project state file
- Message queue directory
- Initial requirements documentation

### 2. Agent Coordination Flow

**Database Stage**:
1. Database Admin receives requirements
2. Designs schema and creates migrations
3. Signals completion to Backend Developer

**Backend Stage**:
1. Backend Developer receives database schema
2. Creates tRPC routers and API endpoints
3. Signals completion to Frontend Developer

**Frontend Stage**:
1. Frontend Developer receives API specifications
2. Creates React components and pages
3. Signals completion to QA DevOps

**Testing Stage**:
1. QA DevOps receives all components
2. Creates test suites and CI/CD pipelines
3. Signals deployment readiness

### 3. Full Project Execution
```bash
agents___execute-full-project --projectId "my-app" --requirements "Complete application requirements"
```

**Automated Flow**:
- Analyzes requirements
- Creates execution plan
- Coordinates all agents in sequence
- Handles dependencies automatically

## Message Structure

### Task Message
```json
{
  "id": "msg_123456789_abc123",
  "from": "linker",
  "to": "frontend-developer",
  "type": "task",
  "payload": {
    "task": "Create login form",
    "requirements": "React form with email/password validation",
    "context": {
      "projectId": "my-app",
      "currentStage": "frontend",
      "dependencies": ["backend-auth-api"]
    }
  },
  "status": "pending",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Response Message
```json
{
  "id": "msg_123456790_def456",
  "from": "frontend-developer",
  "to": "linker",
  "type": "response",
  "payload": {
    "result": "Login form component created",
    "files": ["src/components/LoginForm.tsx"],
    "nextSteps": ["Integrate with backend API"],
    "originalTaskId": "msg_123456789_abc123"
  },
  "status": "completed",
  "timestamp": "2025-01-01T00:05:00.000Z"
}
```

## Agent Dependencies

### Frontend Developer Needs
- API specifications from Backend Developer
- tRPC router types and procedures
- Authentication flow documentation

### Backend Developer Needs
- Database schema from Database Admin
- Prisma client and types
- Business logic requirements

### Database Admin Needs
- Data requirements and relationships
- Performance requirements
- Scalability considerations

### QA DevOps Needs
- All components from other agents
- Deployment requirements
- Testing specifications

## Coordination Commands

### Check Project Status
```bash
agents___project-status --projectId "my-app"
```

### Individual Agent Tasks
```bash
# Assign specific task to agent
agents___frontend-developer --projectId "my-app" --task "Create dashboard" --requirements "User dashboard with navigation"
```

## Best Practices

### For Linkers (Users)
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
**Communication Issues**: Verify message queue structure
