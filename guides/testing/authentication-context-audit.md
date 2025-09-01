# Authentication and Context Providers Audit Report

## Overview
Comprehensive security-focused audit of the authentication system, context providers, session management, and role-based access control in the Isha Gramotsavam Next.js application.

## Files Audited

### Authentication Core
- `/src/context/AuthContext.tsx` - Main authentication context provider
- `/src/app/api/auth/login/route.ts` - OIDC login initiation
- `/src/app/api/auth/callback/route.ts` - OIDC callback handler  
- `/src/app/api/auth/me/route.ts` - User session validation
- `/src/app/api/auth/logout/route.ts` - Session cleanup
- `/src/app/api/auth/mock/route.ts` - Mock authentication endpoint

### Authorization & Middleware
- `/src/server/api/trpc.ts` - tRPC authentication middleware
- `/src/lib/utils/navigation.ts` - Navigation and redirect logic
- Role-based access control implementations

### Context Providers
- `/src/context/NotificationContext.tsx` - Notification system
- `/src/app/layout.tsx` - Root layout with providers

## Critical Security Vulnerabilities Found

### 🔴 Authentication Bypass via Fallback Mechanism

**Location**: `/src/context/AuthContext.tsx:224-248`
```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Temporary fallback while AuthProvider issues are being resolved
    return {
      user: null,
      userProfile: null,
      profileImage: null,
      loading: false,
      login: async () => {
        const response = await fetch('/api/auth/login', { method: 'POST' });
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      },
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      },
      refreshUser: async () => {},
      isAuthenticated: false,
      hasRole: () => false,
      updateLanguagePreference: async () => {},
      hasLanguagePreference: false,
    };
  }
  return context;
};
```
**Severity**: CRITICAL
**Issue**: Fallback mechanism allows components to bypass proper authentication context, potentially causing inconsistent authentication states

### 🔴 Production Mock Authentication Endpoint

**Location**: `/src/app/api/auth/mock/route.ts:6-47`
```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role || !['admin', 'public', 'captain', 'player', 'verification_volunteer', 'technical_volunteer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch real user from database based on role
    let user = await prisma.user.findFirst({
      where: { 
        role: role === 'admin' ? 'admin' : 
              role === 'captain' ? 'captain' : 
              role === 'player' ? 'player' : 
              role === 'verification_volunteer' ? 'verification_volunteer' :
              role === 'technical_volunteer' ? 'technical_volunteer' : 
              'public'
      }
    });
    // ... sets authentication cookie
  }
}
```
**Severity**: CRITICAL
**Issue**: Mock authentication endpoint allows complete bypass of OIDC authentication system - anyone can authenticate as any user role

### 🔴 Excessive Debug Logging

**Location**: `/src/context/AuthContext.tsx:139-142`
```typescript
if (response.ok) {
  const { user } = await response.json();
  if (user) {
    sessionStorage.setItem('userId', user.id);
    setUser(user);
```
**Location**: Multiple authentication files
**Issue**: Sensitive authentication data logged to console in production, exposing user information and authentication flows

### 🔴 SessionStorage Security Risk

**Location**: `/src/context/AuthContext.tsx:141, 162, 179`
```typescript
sessionStorage.setItem('userId', user.id);
const storedUserId = sessionStorage.getItem('userId');
sessionStorage.removeItem('userId');
```
**Severity**: HIGH
**Issue**: SessionStorage is vulnerable to XSS attacks and can be accessed by malicious scripts

## High Priority Security Issues

### 🟠 Session Management Vulnerabilities

**Location**: `/src/app/api/auth/me/route.ts:8-13`
```typescript
const userId = request.cookies.get('userId')?.value;
if (!userId) {
  return NextResponse.json({ user: null });
}
```
**Issue**: No session validation beyond checking cookie existence - sessions never expire, no cryptographic validation

### 🟠 Cookie Security Issues

**Location**: `/src/app/api/auth/mock/route.ts:33-38`
```typescript
response.cookies.set('userId', user.id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
});
```
**Issue**: Missing `maxAge`, no encryption, vulnerable to session fixation attacks

### 🟠 Role-Based Access Control Inconsistencies

**Location**: `/src/server/api/trpc.ts:102-116`
```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }
  // No role validation here - relies on individual procedures
})
```
**Issue**: Inconsistent role checking across different parts of the application

### 🟠 Input Validation Gaps

**Location**: `/src/app/api/auth/callback/route.ts`
**Issue**: OIDC callback parameters not properly validated - potential for authorization code injection

## Medium Priority Issues

### 🟡 Race Conditions in Authentication Flow

**Location**: `/src/context/AuthContext.tsx:119-193`
```typescript
useEffect(() => {
  const initializeAuth = async () => {
    setLoading(true);
    try {
      // Multiple async operations without proper sequencing
      const urlParams = new URLSearchParams(window.location.search);
      const authSuccess = urlParams.get('auth');
      // ... complex initialization logic
    }
  };
  initializeAuth();
}, []);
```
**Issue**: Complex authentication initialization with potential race conditions

### 🟡 Error Information Disclosure

**Location**: Multiple authentication files
**Issue**: Error messages expose internal system information that could aid attackers

### 🟡 CSRF Protection Missing

**Location**: Authentication API routes
**Issue**: No CSRF token validation in authentication endpoints

## Authorization Analysis

### Role-Based Access Control Implementation

**Current Implementation Issues**:
1. **Inconsistent role checking** across different components
2. **No centralized role validation** - each component implements its own checks
3. **Missing role hierarchy** - no support for role inheritance or permissions

**Example Vulnerability**:
```typescript
// Component A checks user.role === 'admin'
// Component B checks userProfile?.role === 'admin'  
// Component C checks hasRole('admin')
// Inconsistent authentication state checking
```

### Permission Escalation Risks

**Location**: `/src/lib/utils/navigation.ts:61-74`
```typescript
// Special roles that can skip profile completion
const specialRole = role === 'admin' || role === 'public' || (role && role.includes('volunteer'));

if (isProfileComplete || specialRole) {
  const dashboardRoute = getDashboardRoute(role, lang, hasLanguagePreference);
  router.push(dashboardRoute);
} else {
  router.push(`/${lang}/profile/complete`);
}
```
**Issue**: String-based role checking vulnerable to role name manipulation

## Session Management Analysis

### Current Session Flow Issues

1. **No session expiration**: Sessions persist indefinitely
2. **No session invalidation**: Old sessions remain valid after password changes
3. **No concurrent session limits**: Users can have unlimited active sessions
4. **No session monitoring**: No detection of suspicious session activity

### Recommended Session Security Model

```typescript
interface SecureSession {
  sessionId: string;          // Cryptographically random session ID
  userId: string;             // User identifier
  role: string;               // User role
  issuedAt: number;          // Session creation timestamp
  expiresAt: number;         // Session expiration timestamp
  lastActivity: number;      // Last activity timestamp
  ipAddress: string;         // Client IP for session validation
  userAgent: string;         // Client user agent
  csrfToken: string;         // CSRF protection token
}
```

## Recommendations

### Immediate Actions (Critical)

1. **Remove Mock Authentication in Production**:
   ```typescript
   // Add environment check
   export async function GET(request: NextRequest) {
     if (process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Not available' }, { status: 404 });
     }
     // Mock auth logic only in development
   }
   ```

2. **Fix Authentication Context Fallback**:
   ```typescript
   export const useAuth = () => {
     const context = useContext(AuthContext);
     if (context === undefined) {
       throw new Error('useAuth must be used within an AuthProvider');
     }
     return context;
   };
   ```

3. **Implement Secure Session Management**:
   ```typescript
   import jwt from 'jsonwebtoken';
   
   // Generate secure session token
   const sessionToken = jwt.sign(
     { 
       userId: user.id, 
       role: user.role,
       sessionId: generateSecureId() 
     },
     process.env.JWT_SECRET,
     { 
       expiresIn: '24h',
       issuer: 'isha-gramotsavam',
       audience: 'app-users'
     }
   );
   
   response.cookies.set('session', sessionToken, {
     httpOnly: true,
     secure: true,
     sameSite: 'strict',
     maxAge: 24 * 60 * 60 * 1000, // 24 hours
     path: '/'
   });
   ```

### Short-term Actions (High Priority)

1. **Replace sessionStorage with secure alternatives**:
   ```typescript
   // Remove sessionStorage usage
   // Use HTTP-only cookies with proper security flags
   ```

2. **Add proper input validation**:
   ```typescript
   // Validate all authentication parameters
   const validateAuthCallback = (code: string, state: string) => {
     if (!code || code.length < 10 || code.length > 500) {
       throw new Error('Invalid authorization code');
     }
     // Additional validation logic
   };
   ```

3. **Implement CSRF protection**:
   ```typescript
   // Add CSRF token to all authentication requests
   import csrf from 'csrf';
   const tokens = new csrf();
   ```

### Long-term Actions (Medium Priority)

1. **Centralize role-based access control**:
   ```typescript
   export class AuthorizationService {
     static hasPermission(user: User, permission: Permission): boolean {
       return user.role.permissions.includes(permission);
     }
     
     static canAccess(user: User, resource: Resource): boolean {
       return this.hasPermission(user, resource.requiredPermission);
     }
   }
   ```

2. **Add comprehensive audit logging**:
   ```typescript
   // Log all authentication events
   const auditLogger = {
     loginAttempt: (userId: string, success: boolean, ip: string) => {
       // Log to secure audit system
     },
     sessionCreated: (userId: string, sessionId: string) => {
       // Log session creation
     }
   };
   ```

3. **Implement session monitoring**:
   ```typescript
   // Monitor for suspicious session activity
   // Detect concurrent sessions, unusual IP changes, etc.
   ```

## Security Testing Recommendations

### Penetration Testing Focus Areas

1. **Session Management**: Test session fixation, hijacking, and replay attacks
2. **Role Escalation**: Attempt to access higher privileged functions
3. **Authentication Bypass**: Test all possible bypass mechanisms
4. **Input Validation**: Test injection attacks on authentication parameters

### Automated Security Testing

1. **SAST (Static Application Security Testing)**: Scan for hardcoded secrets and vulnerabilities
2. **DAST (Dynamic Application Security Testing)**: Test running authentication flows
3. **Dependency Scanning**: Check for vulnerable authentication libraries

## Security Rating: ⚠️ CRITICAL RISK

The authentication system has fundamental security flaws that make the application unsuitable for production deployment. The mock authentication endpoint and authentication bypass mechanisms pose immediate security risks. The session management lacks basic security controls like expiration and validation.

## Compliance Impact

These vulnerabilities would likely result in:
- **GDPR violations** due to inadequate data protection
- **SOC 2 compliance failures** due to access control issues  
- **OWASP Top 10 violations** including broken authentication and security misconfiguration

Immediate remediation of critical issues is required before any production deployment or handling of real user data.