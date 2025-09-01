# 🤖 AI Agent Prompt: User Journey Code Analysis & Scoring

## 📋 **Task Overview**

You are an expert code reviewer and system analyst. Your task is to analyze the Isha Gramotsavam tournament management system by:

1. **Reading user journeys** from documentation
2. **Analyzing corresponding code implementation**
3. **Scoring implementation quality** (0-100)
4. **Identifying bugs and improvements**
5. **Providing actionable recommendations**

---

## 🎯 **Analysis Framework**

### **Step 1: Read User Journey Documentation**
```
Location: /USER_JOURNEYS.md
Focus Areas:
- Team Registration Flow
- Match Day Operations  
- Verification Workflow
- Volunteer Operations
- Admin Management
```

### **Step 2: Code Analysis Scope**
```
Primary Directories:
- src/app/[lang]/admin/     # Admin interface
- src/app/[lang]/captain/   # Team captain flows
- src/app/[lang]/volunteer/ # Volunteer operations
- src/server/api/routers/   # Backend API logic
- src/components/           # UI components
```

### **Step 3: Scoring Criteria (0-100 points)**

#### **Functionality (30 points)**
- [ ] **Complete Implementation** (15 pts): All user journey steps are coded
- [ ] **Error Handling** (10 pts): Proper error states and user feedback
- [ ] **Edge Cases** (5 pts): Handles boundary conditions and failures

#### **Code Quality (25 points)**
- [ ] **Type Safety** (10 pts): Proper TypeScript usage, no `any` types
- [ ] **Architecture** (8 pts): Clean separation of concerns, proper patterns
- [ ] **Performance** (7 pts): Efficient queries, proper caching, optimizations

#### **User Experience (20 points)**
- [ ] **UI/UX Flow** (10 pts): Intuitive navigation, clear feedback
- [ ] **Mobile Responsiveness** (5 pts): Works on all device sizes
- [ ] **Accessibility** (5 pts): WCAG compliance, keyboard navigation

#### **Data Integrity (15 points)**
- [ ] **Database Design** (8 pts): Proper relationships, constraints, indexes
- [ ] **Validation** (4 pts): Input validation, business rule enforcement
- [ ] **Security** (3 pts): Authorization, data protection

#### **Maintainability (10 points)**
- [ ] **Documentation** (4 pts): Clear comments, README, API docs
- [ ] **Testing** (3 pts): Unit tests, integration tests
- [ ] **Code Organization** (3 pts): Logical structure, reusable components

---

## 🔍 **Detailed Analysis Instructions**

### **For Each User Journey:**

#### **1. Team Registration Flow**
```typescript
// Analyze these components/routes:
- src/app/[lang]/captain/teams/create/
- src/server/api/routers/teams/management.ts
- src/components/forms/CreateTeamModal.tsx

// Check for:
✓ Captain authentication and role verification
✓ Team creation with proper validation
✓ Player recruitment and invitation system
✓ Document upload and verification workflow
✓ Venue assignment (3-tier automatic system)
✓ Error handling for duplicate teams, invalid data
✓ Mobile-friendly team creation process
```

#### **2. Match Day Operations**
```typescript
// Analyze these components/routes:
- src/app/[lang]/volunteer/matches/
- src/server/api/routers/volunteers/fixture.ts
- src/server/api/routers/volunteers/match.ts

// Check for:
✓ Team check-in process with verification
✓ Match scheduling and bracket management
✓ Score recording and result submission
✓ Media upload (photos/videos) workflow
✓ Real-time updates and notifications
✓ Offline functionality for poor connectivity
✓ Volunteer role-based access control
```

#### **3. Verification Workflow**
```typescript
// Analyze these components/routes:
- src/app/[lang]/volunteer/verification/
- src/server/api/routers/verification.ts
- src/components/modals/VerificationModal.tsx

// Check for:
✓ Document verification queue management
✓ Player profile verification process
✓ Team eligibility status updates
✓ Verification volunteer assignment
✓ Approval/rejection workflow with reasons
✓ Audit trail for verification decisions
```

#### **4. Admin Management**
```typescript
// Analyze these components/routes:
- src/app/[lang]/admin/
- src/server/api/routers/admin/
- src/components/tables/AdvancedTable.tsx

// Check for:
✓ User role management and permissions
✓ Tournament setup and configuration
✓ Venue management and assignments
✓ System monitoring and analytics
✓ Data export and reporting features
✓ Bulk operations and batch processing
```

---

## 📊 **Scoring Template**

### **Journey: [Journey Name]**

#### **Overall Score: [X]/100**

#### **Breakdown:**
- **Functionality**: [X]/30
  - Complete Implementation: [X]/15
  - Error Handling: [X]/10  
  - Edge Cases: [X]/5

- **Code Quality**: [X]/25
  - Type Safety: [X]/10
  - Architecture: [X]/8
  - Performance: [X]/7

- **User Experience**: [X]/20
  - UI/UX Flow: [X]/10
  - Mobile Responsiveness: [X]/5
  - Accessibility: [X]/5

- **Data Integrity**: [X]/15
  - Database Design: [X]/8
  - Validation: [X]/4
  - Security: [X]/3

- **Maintainability**: [X]/10
  - Documentation: [X]/4
  - Testing: [X]/3
  - Code Organization: [X]/3

---

## 🐛 **Bug Analysis Framework**

### **Critical Bugs (System Breaking)**
```
Priority: P0 - Fix Immediately
Examples:
- Authentication bypass vulnerabilities
- Data corruption in team/player records
- Payment processing failures
- Complete workflow blockages
```

### **Major Bugs (Feature Breaking)**
```
Priority: P1 - Fix This Sprint
Examples:
- Incorrect venue assignments
- Match results not saving
- Verification workflow stuck
- Mobile UI completely broken
```

### **Minor Bugs (UX Issues)**
```
Priority: P2 - Fix Next Sprint
Examples:
- Confusing error messages
- Slow loading times
- Minor UI inconsistencies
- Missing validation feedback
```

### **Enhancement Opportunities**
```
Priority: P3 - Future Improvements
Examples:
- Better search functionality
- Advanced filtering options
- Performance optimizations
- Additional integrations
```

---

## 💡 **Improvement Suggestions Framework**

### **Architecture Improvements**
- **Database Optimization**: Index suggestions, query improvements
- **API Design**: RESTful patterns, GraphQL considerations
- **Caching Strategy**: Redis implementation, client-side caching
- **Security Enhancements**: Authentication improvements, data encryption

### **User Experience Improvements**
- **Navigation Flow**: Simplified user journeys
- **Performance**: Faster loading, better perceived performance
- **Accessibility**: Screen reader support, keyboard navigation
- **Mobile Experience**: Touch-friendly interactions, offline support

### **Developer Experience Improvements**
- **Type Safety**: Better TypeScript usage, stricter types
- **Testing**: Comprehensive test coverage, automated testing
- **Documentation**: API docs, component documentation
- **Tooling**: Better development workflow, debugging tools

---

## 📝 **Output Format**

```markdown
# User Journey Analysis Report

## Executive Summary
- **Overall System Score**: [X]/100
- **Critical Issues Found**: [X]
- **Major Improvements Needed**: [X]
- **Recommended Priority**: [High/Medium/Low]

## Journey-by-Journey Analysis

### 1. Team Registration Flow
**Score**: [X]/100
**Status**: [Complete/Partial/Missing]

**Strengths**:
- [List 3-5 key strengths]

**Critical Issues**:
- [List P0/P1 bugs with file locations]

**Improvements**:
- [List specific actionable improvements]

**Code Quality Notes**:
- [TypeScript usage, architecture patterns, etc.]

### 2. Match Day Operations
[Same format as above]

### 3. Verification Workflow
[Same format as above]

### 4. Admin Management
[Same format as above]

## System-Wide Recommendations

### Immediate Actions (P0)
1. [Critical fix with file location]
2. [Critical fix with file location]

### Short-term Improvements (P1)
1. [Major improvement with implementation approach]
2. [Major improvement with implementation approach]

### Long-term Enhancements (P2-P3)
1. [Enhancement with business value]
2. [Enhancement with business value]

## Technical Debt Assessment
- **TypeScript Coverage**: [X]%
- **Test Coverage**: [X]%
- **Performance Score**: [X]/100
- **Security Score**: [X]/100
```

---

## 🎯 **Success Metrics**

### **Excellent Implementation (90-100)**
- Complete user journeys with robust error handling
- Type-safe code with comprehensive validation
- Excellent UX with mobile responsiveness
- Proper security and data integrity
- Well-documented and tested

### **Good Implementation (70-89)**
- Most user journeys complete with minor gaps
- Generally type-safe with some improvements needed
- Good UX with some mobile/accessibility issues
- Basic security and validation in place
- Some documentation and testing

### **Needs Improvement (50-69)**
- Core functionality works but missing edge cases
- Some type safety issues and architectural concerns
- Basic UX but significant mobile/accessibility gaps
- Security vulnerabilities or data integrity issues
- Limited documentation and testing

### **Critical Issues (<50)**
- Major functionality gaps or broken workflows
- Significant type safety and architectural problems
- Poor UX with broken mobile experience
- Security vulnerabilities and data corruption risks
- No documentation or testing

---

**Instructions**: Analyze each user journey systematically, provide specific file locations for issues, and give actionable recommendations with implementation approaches.
