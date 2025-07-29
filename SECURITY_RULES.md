# Firebase Security Rules - Isha Gramotsavam

## Overview
This document outlines the comprehensive security rules for the Isha Gramotsavam tournament management system, covering both Firestore database and Firebase Storage access controls.

## User Roles and Permissions

### Role Hierarchy
1. **Public/Guest** - No authentication required
2. **Player** - Registered tournament participant  
3. **Captain** - Team leader with player management rights
4. **Verification Volunteer** - Document and team verification rights
5. **Admin** - Full system administration rights

### Role-Based Access Control

#### Public Access
- Read sports information, rules, and tournament data
- View approved/active teams and public media
- No write permissions

#### Player Access  
- Read own profile and team information
- Update own profile data (excluding sensitive fields)
- View teams they belong to
- Read notifications targeted to them

#### Captain Access
- All player permissions
- Create and manage their own teams
- Add/remove players from their teams (draft status only)
- Submit teams for verification
- Update team information (while in draft/revision status)

#### Verification Volunteer Access
- Read all submitted teams and player data
- Update verification status for teams and players
- Access uploaded documents (Aadhaar, photos)
- Create verification-related notifications
- Read team verification records

#### Admin Access
- Full read/write access to all collections
- Manage user roles and permissions
- System configuration and maintenance
- Access audit logs and analytics

## Firestore Security Rules

### Key Collections

#### Users Collection (`/users/{userId}`)
- **Read**: Authenticated users can read basic profile data
- **Create**: Users can create their own profile
- **Update**: Users can update their own profile (excluding role/permissions)
- **Delete**: Admin only

#### Teams Collection (`/teams/{teamId}`)
- **Read**: Authenticated users, public for approved teams
- **Create**: Authenticated users (captain role assigned by system)
- **Update**: Team captains, verification volunteers, admins
- **Delete**: Team captains (draft status only), admins

#### Teams Subcollections
- **Players** (`/teams/{teamId}/players/{playerId}`)
  - Read/Write: Team captains, verification volunteers, admins
- **Verification** (`/teams/{teamId}/verification/{verificationId}`)
  - Read: Verification volunteers, admins, team captains
  - Write: Verification volunteers, admins

#### Notifications Collection (`/notifications/{notificationId}`)
- **Read**: Target users and roles
- **Create**: Admins, volunteers, verification volunteers
- **Update**: Users can mark as read

## Firebase Storage Security Rules

### Storage Paths and Access

#### Profile Photos (`/Profilephotos/{userId}/`)
- **Write**: User owns the file, 5MB limit, images only
- **Read**: All authenticated users

#### Aadhaar Documents (`/Aadhar/{userId}/`)
- **Write**: User owns the file, 5MB limit, images only  
- **Read**: File owner, verification volunteers, admins only

#### Team Documents (`/Teams/{teamId}/`)
- **Write**: Team captains, 10MB limit
- **Read**: Team captains, verification volunteers, admins

#### Public Media (`/Media/{year}/{eventId}/`)
- **Write**: Authenticated users, 20MB limit
- **Read**: Public access

## Security Features

### Data Validation
- File size limits enforced at storage level
- Content type validation for images
- Role-based field update restrictions
- Sensitive data access controls

### Privacy Protection
- Aadhaar documents restricted to authorized personnel only
- Personal data access limited by role
- Audit trail for sensitive operations

### Verification Workflow
- Team status progression controls
- Document verification access restrictions
- Volunteer-specific permissions for verification tasks

## Implementation Notes

### Helper Functions
- `isAuthenticated()` - Checks user authentication
- `isRole(role)` - Validates user role
- `isTeamCaptain(teamId)` - Checks team ownership
- `isVerificationVolunteer()` - Validates verification permissions
- `isAdmin()` - Checks admin privileges

### Security Best Practices
- Principle of least privilege enforced
- Sensitive operations logged for audit
- Multi-layer validation (client + server + rules)
- Role-based access at document and field level

## Deployment

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Storage Rules  
```bash
firebase deploy --only storage
```

### Combined Deployment
```bash
firebase deploy --only firestore:rules,storage
```

## Testing

Ensure all security rules are tested with different user roles before production deployment:

1. Test public access (unauthenticated)
2. Test player permissions
3. Test captain team management
4. Test verification volunteer access
5. Test admin privileges
6. Test cross-role access restrictions

## Monitoring

- Enable Firestore and Storage audit logs
- Monitor failed permission attempts
- Regular security rule reviews
- Document access pattern analysis