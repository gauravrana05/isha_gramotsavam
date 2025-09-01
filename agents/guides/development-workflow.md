# Development Workflow Guide

This guide provides step-by-step workflows for using the Multi-Agent Development Platform to build applications.

## Quick Start Workflow

### 1. Setup and Training
```bash
# First time setup - train all agents
agents___train-all-agents

# Verify training completed successfully
# Check for "TRAINING COMPLETE" responses
```

### 2. Project Initialization
```bash
# Create new project
agents___project-init --projectId "blog-app" --requirements "Build a blog platform with user authentication, post creation, and commenting system"

# Check initial project state
agents___project-status --projectId "blog-app"
```

### 3. Automated Development
```bash
# Let agents coordinate automatically
agents___execute-full-project --projectId "blog-app" --requirements "Complete blog platform with authentication, posts, comments, and admin dashboard"
```

## Manual Workflow (Step-by-Step)

### Phase 1: Database Design
```bash
# Design database schema
agents___database-admin --projectId "blog-app" --task "Design blog database schema" --requirements "Users, posts, comments, tags, categories with proper relationships and indexes"

# Check database output
agents___project-status --projectId "blog-app"
```

### Phase 2: Backend Development
```bash
# Create API endpoints
agents___backend-developer --projectId "blog-app" --task "Create blog API" --requirements "tRPC routers for authentication, posts CRUD, comments, user management with proper validation and security"

# Verify backend completion
agents___project-status --projectId "blog-app"
```

### Phase 3: Frontend Development
```bash
# Build user interface
agents___frontend-developer --projectId "blog-app" --task "Create blog frontend" --requirements "Next.js app with login, post creation/editing, comment system, responsive design using Tailwind CSS"

# Check frontend output
agents___project-status --projectId "blog-app"
```

### Phase 4: Testing and Deployment
```bash
# Setup testing and deployment
agents___qa-devops --projectId "blog-app" --task "Setup testing and deployment" --requirements "Unit tests, E2E tests, CI/CD pipeline, AWS Amplify deployment configuration"

# Final project status
agents___project-status --projectId "blog-app"
```

## Specialized Workflows

### E-commerce Platform
```bash
# Initialize e-commerce project
agents___project-init --projectId "ecommerce" --requirements "E-commerce platform with products, cart, payments, orders, inventory management"

# Database design for e-commerce
agents___database-admin --projectId "ecommerce" --task "Design e-commerce schema" --requirements "Products, categories, users, orders, payments, inventory, reviews with optimized queries"

# Backend with payment integration
agents___backend-developer --projectId "ecommerce" --task "Create e-commerce API" --requirements "Product catalog, cart management, Stripe payment integration, order processing, inventory tracking"

# Frontend with shopping experience
agents___frontend-developer --projectId "ecommerce" --task "Build e-commerce UI" --requirements "Product listings, shopping cart, checkout flow, user dashboard, admin panel, mobile-responsive"

# Testing and deployment
agents___qa-devops --projectId "ecommerce" --task "E-commerce testing and deployment" --requirements "Payment testing, load testing, security testing, production deployment"
```

### SaaS Dashboard
```bash
# Initialize SaaS project
agents___project-init --projectId "saas-dashboard" --requirements "Multi-tenant SaaS dashboard with user management, analytics, billing, and API access"

# Multi-tenant database design
agents___database-admin --projectId "saas-dashboard" --task "Design multi-tenant schema" --requirements "Tenant isolation, user roles, subscriptions, usage tracking, audit logs"

# SaaS backend with billing
agents___backend-developer --projectId "saas-dashboard" --task "Create SaaS API" --requirements "Multi-tenancy, role-based access, Stripe billing, usage metering, API rate limiting"

# Dashboard frontend
agents___frontend-developer --projectId "saas-dashboard" --task "Build SaaS dashboard" --requirements "Admin dashboard, user management, analytics charts, billing interface, API documentation"

# Enterprise testing
agents___qa-devops --projectId "saas-dashboard" --task "Enterprise testing setup" --requirements "Multi-tenant testing, security testing, performance testing, compliance validation"
```

## Iterative Development

### Refinement Workflow
```bash
# Get current project status
agents___project-status --projectId "my-app"

# Refine specific component
agents___frontend-developer --projectId "my-app" --task "Improve user dashboard" --requirements "Add real-time notifications, improve mobile responsiveness, add dark mode support"

# Update backend for new features
agents___backend-developer --projectId "my-app" --task "Add notification system" --requirements "Real-time notifications with WebSocket, email notifications, notification preferences"

# Update tests for new features
agents___qa-devops --projectId "my-app" --task "Test notification system" --requirements "WebSocket testing, email testing, notification delivery testing"
```

### Feature Addition
```bash
# Add new feature to existing project
agents___database-admin --projectId "blog-app" --task "Add social features" --requirements "User following, post likes, social feed, activity tracking"

agents___backend-developer --projectId "blog-app" --task "Implement social API" --requirements "Follow/unfollow endpoints, like system, activity feed generation, social notifications"

agents___frontend-developer --projectId "blog-app" --task "Build social UI" --requirements "Follow buttons, like buttons, activity feed, user profiles, social interactions"
```

## Best Practices

### Project Planning
1. **Clear Requirements**: Provide detailed, specific requirements
2. **Scope Definition**: Define MVP vs full feature set
3. **Technology Choices**: Specify preferred technologies and constraints
4. **Performance Goals**: Include performance and scalability requirements

### Agent Coordination
1. **Sequential Execution**: Follow database → backend → frontend → testing order
2. **Dependency Management**: Ensure each agent has required inputs
3. **Progress Monitoring**: Check project status between phases
4. **Error Handling**: Address blockers before proceeding

### Quality Assurance
1. **Incremental Testing**: Test after each phase completion
2. **Integration Testing**: Verify agent outputs work together
3. **Performance Testing**: Include performance requirements
4. **Security Review**: Ensure security best practices

### Deployment Strategy
1. **Environment Setup**: Define development, staging, production environments
2. **CI/CD Pipeline**: Automate testing and deployment
3. **Monitoring**: Include logging and monitoring setup
4. **Rollback Plan**: Prepare for deployment issues

## Common Patterns

### Authentication System
```bash
# Standard auth implementation
agents___database-admin --task "User authentication schema" --requirements "Users, sessions, password reset, email verification"
agents___backend-developer --task "Auth API" --requirements "JWT authentication, password hashing, email verification, session management"
agents___frontend-developer --task "Auth UI" --requirements "Login, register, password reset, email verification forms"
```

### CRUD Operations
```bash
# Generic CRUD pattern
agents___database-admin --task "CRUD schema" --requirements "Entity with standard fields, audit trail, soft delete"
agents___backend-developer --task "CRUD API" --requirements "Create, read, update, delete endpoints with validation and permissions"
agents___frontend-developer --task "CRUD UI" --requirements "List view, detail view, create/edit forms, delete confirmation"
```

### Real-time Features
```bash
# Real-time functionality
agents___backend-developer --task "Real-time system" --requirements "WebSocket connections, real-time updates, presence tracking"
agents___frontend-developer --task "Real-time UI" --requirements "Live updates, connection status, optimistic updates"
```

## Troubleshooting Workflows

### Agent Not Responding
1. Check agent training status
2. Verify Q CLI availability
3. Check project state integrity
4. Restart MCP server if needed

### Coordination Issues
1. Verify protocol training completion
2. Check message queue for errors
3. Review agent dependencies
4. Clear and reinitialize project state

### Quality Issues
1. Review agent outputs for completeness
2. Test integration between components
3. Provide more specific requirements
4. Iterate with refinement tasks

### Performance Issues
1. Monitor system resources during execution
2. Break large tasks into smaller ones
3. Use parallel execution where possible
4. Optimize agent coordination overhead
