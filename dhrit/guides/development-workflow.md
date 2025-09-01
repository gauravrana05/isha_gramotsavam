# Development Workflow Guide

This guide provides step-by-step workflows for using the Dhrit Platform to build applications with 8 specialized AI agents.

## Quick Start Workflow

### 1. Setup and Training
```bash
# First time setup - train all 8 agents
dhrit___train-all-agents

# Verify training completed successfully
# Check for "TRAINING COMPLETE" responses
```

### 2. Project Initialization
```bash
# Create new project
dhrit___init --projectId "blog-app" --requirements "Build a blog platform with user authentication, post creation, and commenting system"

# Check initial project state
dhrit___status --projectId "blog-app"
```

### 3. Automated 8-Agent Development
```bash
# Let all 8 agents coordinate automatically
dhrit___build --projectId "blog-app" --requirements "Complete blog platform with authentication, posts, comments, and admin dashboard"
```

## Manual Workflow (Step-by-Step)

### Phase 1: Architecture & Design Foundation
```bash
# Step 1: System Architecture Design
dhrit___pal --projectId "blog-app" --task "Design system architecture" --requirements "Scalable blog platform with user management, content creation, and real-time features"

# Step 2: Design System Creation
dhrit___kalp --projectId "blog-app" --task "Create design system" --requirements "Modern blog design with clean typography, responsive layout, and accessible components"

# Step 3: Security Planning
dhrit___bandh --projectId "blog-app" --task "Plan security architecture" --requirements "User authentication, content security, data protection, and GDPR compliance"

# Check foundation progress
dhrit___status --projectId "blog-app"
```

### Phase 2: Data & Backend Layer
```bash
# Step 4: Database Design
dhrit___kosh --projectId "blog-app" --task "Design blog database schema" --requirements "Users, posts, comments, tags, categories with proper relationships and indexes"

# Step 5: Backend API Development
dhrit___mool --projectId "blog-app" --task "Create blog API" --requirements "tRPC routers for authentication, posts CRUD, comments, user management with proper validation and security"

# Check backend progress
dhrit___status --projectId "blog-app"
```

### Phase 3: Frontend & Optimization
```bash
# Step 6: Frontend Development
dhrit___roop --projectId "blog-app" --task "Create blog frontend" --requirements "Next.js app with login, post creation/editing, comment system, responsive design using design system"

# Step 7: Performance Optimization
dhrit___gati --projectId "blog-app" --task "Optimize blog performance" --requirements "Fast loading, efficient caching, optimized images, and sub-second response times"

# Check frontend progress
dhrit___status --projectId "blog-app"
```

### Phase 4: Testing and Deployment
```bash
# Step 8: Testing & Deployment
dhrit___dhar --projectId "blog-app" --task "Setup testing and deployment" --requirements "Unit tests, E2E tests, CI/CD pipeline, AWS Amplify deployment configuration"

# Final project status
dhrit___status --projectId "blog-app"
```

## Specialized Workflows

### E-commerce Platform (8-Agent Coordination)
```bash
# Initialize e-commerce project
dhrit___init --projectId "ecommerce" --requirements "E-commerce platform with products, cart, payments, orders, inventory management"

# Architecture & Foundation
dhrit___pal --projectId "ecommerce" --task "Design e-commerce architecture" --requirements "Microservices architecture with payment processing, inventory management, and order fulfillment"

dhrit___kalp --projectId "ecommerce" --task "Create e-commerce design system" --requirements "Professional e-commerce design with product showcases, shopping cart, and checkout flow"

dhrit___bandh --projectId "ecommerce" --task "Plan e-commerce security" --requirements "PCI compliance, secure payments, user data protection, fraud prevention"

# Data & Backend
dhrit___kosh --projectId "ecommerce" --task "Design e-commerce schema" --requirements "Products, categories, users, orders, payments, inventory, reviews with optimized queries"

dhrit___mool --projectId "ecommerce" --task "Create e-commerce API" --requirements "Product catalog, cart management, Stripe payment integration, order processing, inventory tracking"

# Frontend & Optimization
dhrit___roop --projectId "ecommerce" --task "Build e-commerce UI" --requirements "Product listings, shopping cart, checkout flow, user dashboard, admin panel, mobile-responsive"

dhrit___gati --projectId "ecommerce" --task "Optimize e-commerce performance" --requirements "Fast product search, optimized images, efficient caching, CDN integration"

# Testing & Deployment
dhrit___dhar --projectId "ecommerce" --task "E-commerce testing and deployment" --requirements "Payment testing, load testing, security testing, production deployment"
```

### SaaS Dashboard (Enterprise Focus)
```bash
# Initialize SaaS project
dhrit___init --projectId "saas-dashboard" --requirements "Multi-tenant SaaS dashboard with user management, analytics, billing, and API access"

# Enterprise Architecture
dhrit___pal --projectId "saas-dashboard" --task "Design SaaS architecture" --requirements "Multi-tenant architecture with tenant isolation, scalable infrastructure, and API management"

dhrit___bandh --projectId "saas-dashboard" --task "Plan SaaS security" --requirements "Multi-tenancy security, SOC2 compliance, API security, audit logging"

# Multi-tenant Foundation
dhrit___kalp --projectId "saas-dashboard" --task "Create SaaS design system" --requirements "Professional SaaS interface with dashboards, data visualization, and white-label capabilities"

dhrit___kosh --projectId "saas-dashboard" --task "Design multi-tenant schema" --requirements "Tenant isolation, user roles, subscriptions, usage tracking, audit logs"

# SaaS Backend & Frontend
dhrit___mool --projectId "saas-dashboard" --task "Create SaaS API" --requirements "Multi-tenancy, role-based access, Stripe billing, usage metering, API rate limiting"

dhrit___roop --projectId "saas-dashboard" --task "Build SaaS dashboard" --requirements "Admin dashboard, user management, analytics charts, billing interface, API documentation"

# Enterprise Optimization & Deployment
dhrit___gati --projectId "saas-dashboard" --task "Optimize SaaS performance" --requirements "Multi-tenant performance optimization, efficient queries, caching strategies"

dhrit___dhar --projectId "saas-dashboard" --task "Enterprise testing setup" --requirements "Multi-tenant testing, security testing, performance testing, compliance validation"
```

## Iterative Development

### Feature Addition Workflow
```bash
# Get current project status
dhrit___status --projectId "my-app"

# Add new feature with coordinated agents
dhrit___pal --projectId "my-app" --task "Plan social features architecture" --requirements "User following, activity feeds, real-time notifications"

dhrit___kalp --projectId "my-app" --task "Design social UI components" --requirements "Follow buttons, activity feed design, notification components"

dhrit___bandh --projectId "my-app" --task "Review social features security" --requirements "Privacy controls, content moderation, user safety"

dhrit___kosh --projectId "my-app" --task "Add social features schema" --requirements "User following, post likes, activity tracking, notifications"

dhrit___mool --projectId "my-app" --task "Implement social API" --requirements "Follow/unfollow endpoints, like system, activity feed generation, real-time notifications"

dhrit___roop --projectId "my-app" --task "Build social UI" --requirements "Follow buttons, like buttons, activity feed, user profiles, notification center"

dhrit___gati --projectId "my-app" --task "Optimize social features" --requirements "Efficient activity feed queries, real-time performance, notification delivery"

dhrit___dhar --projectId "my-app" --task "Test social features" --requirements "Social interaction testing, real-time feature testing, notification testing"
```

### Refinement Workflow
```bash
# Refine specific aspects with relevant agents
dhrit___kalp --projectId "my-app" --task "Improve design system" --requirements "Add dark mode support, improve accessibility, enhance mobile experience"

dhrit___gati --projectId "my-app" --task "Performance audit" --requirements "Identify bottlenecks, optimize database queries, improve Core Web Vitals"

dhrit___bandh --projectId "my-app" --task "Security audit" --requirements "Vulnerability assessment, security best practices review, compliance check"
```

## Best Practices

### Project Planning
1. **Clear Requirements**: Provide detailed, specific requirements for each agent
2. **Scope Definition**: Define MVP vs full feature set clearly
3. **Technology Choices**: Specify preferred technologies and constraints
4. **Performance Goals**: Include performance and scalability requirements

### 8-Agent Coordination
1. **Sequential Execution**: Follow architecture → design → security → database → backend → frontend → performance → testing order
2. **Dependency Management**: Ensure each agent has required inputs from previous agents
3. **Progress Monitoring**: Check project status between phases
4. **Error Handling**: Address blockers before proceeding to next agent

### Quality Assurance
1. **Incremental Testing**: Test after each agent phase completion
2. **Integration Testing**: Verify agent outputs work together
3. **Performance Testing**: Include performance requirements throughout
4. **Security Review**: Ensure security best practices at each stage

### Deployment Strategy
1. **Environment Setup**: Define development, staging, production environments
2. **CI/CD Pipeline**: Automate testing and deployment with Dhar
3. **Monitoring**: Include logging and monitoring setup
4. **Rollback Plan**: Prepare for deployment issues

## Common Patterns

### Authentication System (8-Agent Pattern)
```bash
# Complete authentication system with all agents
dhrit___pal --task "Auth architecture" --requirements "Scalable authentication with JWT, sessions, and OAuth"
dhrit___kalp --task "Auth UI design" --requirements "Login, register, password reset, profile management UI"
dhrit___bandh --task "Auth security" --requirements "Secure authentication, password policies, session management"
dhrit___kosh --task "User schema" --requirements "Users, sessions, password reset, email verification"
dhrit___mool --task "Auth API" --requirements "JWT authentication, password hashing, email verification, session management"
dhrit___roop --task "Auth UI" --requirements "Login, register, password reset, email verification forms"
dhrit___gati --task "Auth performance" --requirements "Fast authentication, efficient session management"
dhrit___dhar --task "Auth testing" --requirements "Authentication flow testing, security testing"
```

### Real-time Features (Performance-Focused)
```bash
# Real-time functionality with performance optimization
dhrit___pal --task "Real-time architecture" --requirements "WebSocket architecture, real-time data synchronization"
dhrit___mool --task "Real-time backend" --requirements "WebSocket connections, real-time updates, presence tracking"
dhrit___roop --task "Real-time UI" --requirements "Live updates, connection status, optimistic updates"
dhrit___gati --task "Real-time optimization" --requirements "Efficient WebSocket usage, minimal latency, connection management"
```

## Troubleshooting Workflows

### Agent Not Responding
1. Check agent training status with individual training commands
2. Verify Q CLI availability and `/agent` command functionality
3. Check project state integrity with `dhrit___status`
4. Restart coordination if needed

### Coordination Issues
1. Verify protocol training completion for all 8 agents
2. Check Redis and PostgreSQL connections
3. Review agent dependencies and handoffs
4. Clear and reinitialize project state if corrupted

### Quality Issues
1. Review agent outputs for completeness and integration
2. Test integration between agent components
3. Provide more specific requirements to agents
4. Iterate with refinement tasks using relevant agents

### Performance Issues
1. Monitor system resources during 8-agent coordination
2. Break large tasks into smaller, agent-specific tasks
3. Use parallel execution where agents don't have dependencies
4. Optimize Redis and PostgreSQL performance
