# Component Libraries Guide

This guide explains how agents use and build reusable component libraries to accelerate development and maintain consistency.

## Overview

Each agent maintains specialized libraries of reusable components, utilities, and templates that grow over time and improve with each project.

## Library Structure

### Frontend Agent Library
```
agents/libraries/frontend/
├── components/
│   ├── forms/           # LoginForm, RegisterForm, ContactForm
│   ├── ui/              # Button, Modal, Card
│   └── layouts/         # DashboardLayout, AuthLayout
├── hooks/               # useAuth, useApi
└── utils/               # validation, formatting
```

### Backend Agent Library
```
agents/libraries/backend/
├── routers/             # auth, users, crud-base
├── middleware/          # auth, rateLimit, validation
├── utils/               # password, jwt, email
└── templates/           # crud-router, auth-router
```

### Database Agent Library
```
agents/libraries/database/
├── schemas/             # user, auth, audit
├── migrations/          # user-setup, indexes
├── seeds/               # users, roles
└── queries/             # common-queries, performance-queries
```

### QA Agent Library
```
agents/libraries/qa/
├── tests/               # auth, crud, ui
├── configs/             # jest, playwright, eslint
├── utils/               # test-helpers, mock-data
└── templates/           # component-test, api-test
```

## How Agents Use Libraries

### 1. Check Existing Components
Before creating new components, agents:
1. Search their library for existing solutions
2. Evaluate if existing components meet requirements
3. Customize existing components if needed
4. Create new components only when necessary

### 2. Reuse and Customize
```typescript
// Agent workflow example
const existingComponent = await library.getComponent('forms/LoginForm');
if (existingComponent) {
  const customized = await customizeComponent(existingComponent, requirements);
  return customized;
} else {
  const newComponent = await createComponent(requirements);
  await library.addComponent('forms/CustomForm', newComponent);
  return newComponent;
}
```

### 3. Build Library Over Time
Each successful component is:
- Added to the appropriate library
- Documented with usage examples
- Tagged with relevant metadata
- Made available for future projects

## Component Categories

### Frontend Components

**Forms**:
- LoginForm: Email/password authentication
- RegisterForm: User registration with validation
- ContactForm: Contact/feedback forms
- SearchForm: Search functionality

**UI Components**:
- Button: Various styles and states
- Modal: Accessible modal dialogs
- Card: Content containers
- Loading: Loading states and spinners

**Layouts**:
- DashboardLayout: Admin/user dashboards
- AuthLayout: Login/register pages
- LandingLayout: Marketing pages

### Backend Components

**Routers**:
- Auth Router: Login, register, logout
- User Router: User management CRUD
- CRUD Base: Generic CRUD operations

**Middleware**:
- Auth Middleware: JWT validation
- Rate Limiting: API rate protection
- Validation: Input validation

**Utils**:
- Password: Hashing and validation
- JWT: Token generation/validation
- Email: Email sending utilities

### Database Components

**Schemas**:
- User Schema: Standard user model
- Auth Schema: Sessions and tokens
- Audit Schema: Activity logging

**Migrations**:
- User Setup: Initial user tables
- Indexes: Performance indexes
- Constraints: Data integrity

**Queries**:
- Common Queries: Frequently used patterns
- Performance Queries: Optimized operations

### QA Components

**Test Suites**:
- Auth Tests: Authentication testing
- CRUD Tests: API operation testing
- UI Tests: Component testing

**Configurations**:
- Jest Config: Unit testing setup
- Playwright Config: E2E testing
- ESLint Config: Code quality

## Benefits

### Speed
- Agents reuse proven components instead of rebuilding
- Faster development cycles
- Reduced time to market

### Consistency
- Same patterns across all projects
- Unified coding standards
- Predictable component behavior

### Quality
- Battle-tested components with fewer bugs
- Comprehensive test coverage
- Performance optimizations

### Learning
- Agents improve libraries over time
- Knowledge accumulation across projects
- Continuous improvement

## Best Practices

### For Library Management
1. **Consistent Naming**: Use clear, descriptive names
2. **Documentation**: Include usage examples and props
3. **Versioning**: Track component versions and changes
4. **Testing**: Ensure all library components are tested

### For Component Creation
1. **Reusability**: Design for multiple use cases
2. **Flexibility**: Allow customization through props
3. **Accessibility**: Follow WCAG guidelines
4. **Performance**: Optimize for speed and efficiency

### For Library Growth
1. **Regular Review**: Evaluate and improve existing components
2. **Refactoring**: Update components with better patterns
3. **Deprecation**: Remove outdated or unused components
4. **Documentation**: Keep usage guides up to date

## Future Enhancements

### Planned Features
- **Component Discovery**: Search and browse available components
- **Usage Analytics**: Track which components are most used
- **Automatic Updates**: Update components across projects
- **Cross-Agent Sharing**: Share components between agent types
- **Version Management**: Handle component versioning and updates

### Integration Goals
- **Design System**: Integrate with design tokens and themes
- **Testing**: Automated testing for all library components
- **Documentation**: Auto-generated component documentation
- **Performance**: Bundle optimization and tree shaking
