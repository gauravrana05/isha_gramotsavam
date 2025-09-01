# Isha Gramotsavam - User Journeys Documentation

## Overview

Isha Gramotsavam is a comprehensive sports tournament management application designed to organize village-level sports competitions. The platform manages the complete tournament lifecycle from team registration to match scoring and media management.

## User Roles & Permissions

### 1. Admin
**Primary Role**: Complete system administration and oversight
**Key Responsibilities**:
- System configuration and management
- User role management and assignments
- Tournament setup and event management
- Data oversight and analytics
- Audit log monitoring
- **Notification system management**
- **Broadcast messaging to all user roles**
- **Notification template creation and management**
- **Communication analytics and delivery tracking**

### 2. Captain
**Primary Role**: Team creation and management
**Key Responsibilities**:
- Create and register teams for sports
- Recruit and manage team players
- Submit teams for verification
- View team fixtures and matches
- Team profile management
- **Receive notifications from admins and venue volunteers**
- **Manage personal notification preferences**
- **Get real-time match and verification updates**

### 3. Player
**Primary Role**: Participate in teams and tournaments
**Key Responsibilities**:
- Complete personal profile and verification
- Join teams (via captain invitation)
- View team information and fixtures
- Upload media and match participation
- **Receive notifications from admins and venue volunteers**
- **Respond to team invitations and verification requests**
- **Get match schedules and result notifications**

### 4. General Volunteer
**Primary Role**: Venue management and match day operations
**Key Responsibilities**:
- Manage assigned venue operations
- Team check-in and verification
- Match day coordination
- Upload match media

### 5. Technical Volunteer
**Primary Role**: Technical operations and system support
**Key Responsibilities**:
- Advanced venue technical operations
- System maintenance and support
- Technical troubleshooting
- **Send notifications to teams in assigned venues**
- **Notify captains and players about technical updates**
- **Venue-specific communication management**

### 6. Verification Volunteer
**Primary Role**: Document and team verification
**Key Responsibilities**:
- Verify player documents
- Team eligibility verification
- Profile verification approval
- Verification workflow management
- **Send notifications to teams in assigned venues**
- **Notify captains and players about verification status**
- **Document requirement and deadline communications**

### 7. Public/Guest Users
**Primary Role**: Information access and initial registration
**Key Responsibilities**:
- View public tournament information
- Access event schedules and results
- Initial account registration
- **Receive public system announcements**
- **Get tournament updates and general information**
- **Manage basic notification preferences**

## Core User Journeys

### 1. Authentication & Onboarding Journey

#### New User Registration
```
1. Landing Page (Public) → Login/Register
2. Phone-based Authentication (Firebase Auth)
3. Profile Creation Form
   - Personal Information (Name, DOB, Gender)
   - Geographic Information (Village, Panchayat, Taluk, District, State, Pincode)
   - Contact Information (Phone, WhatsApp, Instagram)
   - Language Preference
4. Document Upload
   - Profile Photo
   - Aadhaar Front
   - Aadhaar Back
5. Profile Completion Verification
6. Initial Role Assignment (default: "public")
7. Redirect to Role-based Dashboard
```

#### Returning User Login
```
1. Login Page → Phone Authentication
2. Profile Completion Check
   - If incomplete → Profile Completion Flow
   - If complete → Role-based Dashboard
```

### 2. Admin Management Journey

#### System Administration Flow
```
Dashboard → Admin Overview
├── User Management
│   ├── View All Users → User Details → Edit/Verify
│   ├── Role Assignment → Update User Roles
│   └── Volunteer Management → Assign Venues/Permissions
├── Tournament Setup
│   ├── Events Management → Create/Edit Events
│   ├── Sports Configuration → Manage Sports & Rules
│   ├── Venues Management → Create/Edit Venues
│   └── Fixture Generation → Tournament Brackets
├── Data Management
│   ├── Teams Oversight → Team Verification/Assignment
│   ├── Matches Management → Schedule/Results
│   └── Media Moderation → Review/Approve Media
├── Communication Management
│   ├── Notification Dashboard → View All Notifications & Analytics
│   ├── Create Notifications → Broadcast to All Users/Specific Roles
│   ├── Template Management → Create/Edit Reusable Templates
│   ├── Notification Settings → Configure System Notifications
│   └── Delivery Analytics → Track Notification Success Rates
├── Analytics & Reports
│   ├── Participation Reports
│   ├── Registration Analytics
│   ├── Engagement Metrics
│   └── Communication Analytics → Notification Engagement Stats
└── System Operations
    ├── Audit Logs → Track System Activities
    ├── System Configuration → Platform Settings
    ├── Push Notification Setup → Configure VAPID Keys
    └── Data Backup → System Maintenance
```

### 3. Captain Team Management Journey

#### Team Creation & Management Flow
```
Captain Dashboard → Team Overview
├── Create New Team
│   ├── Select Sport (Volleyball/Throwball)
│   ├── Team Registration Form
│   │   ├── Team Name & Description
│   │   ├── Geographic Information
│   │   └── Gender Category Selection
│   ├── Submit for Review
│   └── Role Promotion (Public → Captain)
├── Manage Existing Teams
│   ├── View Team Details
│   ├── Player Management
│   │   ├── Invite Players → Send Invitations
│   │   ├── Manage Player List → Add/Remove Players
│   │   └── Monitor Player Verification Status
│   ├── Team Profile Management
│   │   ├── Edit Team Information
│   │   └── Upload Team Media
│   └── Submit Team for Final Verification
├── Tournament Participation
│   ├── View Assigned Fixtures
│   ├── Match Schedule & Results
│   └── Tournament Brackets
├── Communication Center
│   ├── View Team Notifications → Admin/Volunteer Messages
│   ├── Notification History → Past Communications
│   ├── Match Updates → Fixture Changes & Results
│   └── Verification Updates → Document/Team Status Changes
└── Team Status Tracking
    ├── Registration Status
    ├── Verification Status
    └── Tournament Progression
```

### 4. Player Participation Journey

#### Player Engagement Flow
```
Player Dashboard → Personal Overview
├── Profile Management
│   ├── Complete Personal Profile
│   ├── Document Verification
│   │   ├── Upload Required Documents
│   │   └── Track Verification Status
│   └── Profile Updates
├── Team Participation
│   ├── View Team Invitations
│   ├── Accept/Decline Team Membership
│   ├── Current Team Information
│   │   ├── Team Details & Members
│   │   ├── Captain Information
│   │   └── Team Status
│   └── Team History
├── Tournament Engagement
│   ├── View Personal Fixtures
│   ├── Match Schedule
│   ├── Match Results & Statistics
│   └── Tournament Brackets
├── Communication Hub
│   ├── Personal Notifications → Admin/Volunteer/Captain Messages
│   ├── Team Invitations → Accept/Decline Team Membership
│   ├── Verification Alerts → Document Status Updates
│   ├── Match Notifications → Schedule Changes & Results
│   └── Push Notification Settings → Configure Mobile Alerts
└── Media & Content
    ├── Upload Match Photos/Videos
    ├── View Team Media
    └── Tournament Highlights
```

### 5. Volunteer Operations Journey

#### Venue Management Flow
```
Volunteer Dashboard → Venue Assignment
├── Assigned Venue Overview
│   ├── Venue Information & Facilities
│   ├── Daily Schedule
│   └── Assigned Matches/Fixtures
├── Match Day Operations
│   ├── Team Check-in Process
│   │   ├── Verify Team Attendance
│   │   ├── Player Verification
│   │   └── Document Checks
│   ├── Match Management
│   │   ├── Match Setup & Coordination
│   │   ├── Officials Assignment
│   │   ├── Score Recording
│   │   └── Match Result Submission
│   └── Facility Management
├── Media Management
│   ├── Upload Match Photos/Videos
│   ├── Real-time Match Coverage
│   └── Media Approval Workflow
├── Reporting & Documentation
│   ├── Daily Activity Reports
│   ├── Incident Reporting
│   └── Equipment & Facility Status
├── Venue Communication Management
│   ├── Send Notifications → Teams in Assigned Venues
│   ├── Notification Templates → Use Pre-defined Messages
│   ├── Recipient Selection → Target Captains/Players by Venue
│   ├── Delivery Tracking → Monitor Message Success
│   └── Communication History → Past Venue Notifications
└── Communication
    ├── Team Communication → Direct Venue-based Messaging
    ├── Admin Coordination
    └── Emergency Protocols
```

### 6. Verification Workflow Journey

#### Document & Team Verification Flow
```
Verification Dashboard → Pending Verifications
├── Player Document Verification
│   ├── Review Submitted Documents
│   │   ├── Profile Photo Verification
│   │   ├── Aadhaar Document Verification
│   │   └── Age & Eligibility Check
│   ├── Verification Decision
│   │   ├── Approve with Comments
│   │   ├── Reject with Reasons
│   │   └── Request Additional Documents
│   └── Update Verification Status
├── Team Verification Process
│   ├── Team Eligibility Review
│   │   ├── Player Count Verification
│   │   ├── Geographic Eligibility
│   │   └── Age Group Compliance
│   ├── Team Composition Check
│   │   ├── Captain Verification
│   │   ├── Player Document Status
│   │   └── Team Formation Rules
│   └── Final Team Approval
├── Profile Verification
│   ├── Personal Information Verification
│   ├── Geographic Information Validation
│   └── Contact Information Verification
├── Verification Communication
│   ├── Send Verification Notifications → Document Status Updates
│   ├── Approval Notifications → Team/Player Verification Success
│   ├── Rejection Notifications → Requirements & Resubmission
│   ├── Reminder Messages → Pending Document Submissions
│   └── Venue-based Targeting → Teams in Assigned Venues
└── Verification Analytics
    ├── Verification Queue Status
    ├── Processing Time Metrics
    ├── Verification Success Rates
    └── Communication Effectiveness → Response Rates to Notifications
```

#### Status Flow Management

**Team Status Flow:**
```
submitted (team created) → verified (all players verified) → checked-in (all players approved on match day)
```

**Player Verification Status Flow:**
```
pending (team created) → verified (by verification volunteer) → approved (on match day by technical volunteer)
```

**Automatic Status Updates:**
- When all players in a team are verified, the team status automatically updates from "submitted" to "verified"
- Team status progression ensures proper workflow management and tournament readiness
- Each status change triggers audit logs and notifications for transparency

### 7. Public/Guest User Journey

#### Information Access Flow
```
Public Landing Page
├── Tournament Information
│   ├── Event Overview & Schedule
│   ├── Participating Sports
│   ├── Venues & Locations
│   └── Tournament Rules & Regulations
├── Live Tournament Updates
│   ├── Current Match Status
│   ├── Live Scores & Results
│   ├── Tournament Brackets
│   └── Match Highlights
├── Registration Portal
│   ├── Account Creation
│   ├── Team Registration Information
│   └── Eligibility Criteria
├── Media Gallery
│   ├── Tournament Photos
│   ├── Match Videos
│   └── Highlights Reel
├── Public Notifications
│   ├── System Announcements → Tournament Updates
│   ├── Schedule Changes → Match Time/Venue Updates
│   ├── Results Notifications → Live Score Updates
│   └── General Information → Rules & Guidelines
└── Contact & Support
    ├── Tournament Officials
    ├── Support Information
    └── FAQ Section
```

## Cross-cutting Journeys

### Profile Completion Workflow
```
All Users (Mandatory Flow):
1. Personal Information Form
2. Geographic Information (Village to State)
3. Contact Information Verification
4. Document Upload Process
5. Profile Verification Queue
6. Role-based Feature Access
```

### Document Verification Process
```
User Upload → Verification Queue → Reviewer Assignment → 
Verification Decision → User Notification → Profile Update
```

### Notification System
```
System Events → Notification Generation → Permission Validation →
Role-based Targeting → Multi-channel Delivery →
In-app Notifications → Push Notifications → Delivery Tracking →
User Dashboard → Notification Center → Action Responses
```

### Push Notification Setup Journey
```
User Login → Browser Permission Request → VAPID Subscription →
Service Worker Registration → Notification Settings Configuration →
Background Sync Setup → Offline Storage → Push Message Delivery
```

### Volunteer Communication Workflow
```
Volunteer Dashboard → Venue Assignment Check → Create Notification →
Recipient Selection (Venue-based) → Template Selection/Custom Message →
Preview & Send → Delivery Tracking → Response Analytics
```

## Tournament Lifecycle Integration

### Pre-Tournament Phase
1. **Admin**: Event setup, venue configuration, sports rules, notification template creation
2. **Captain**: Team registration and player recruitment, notification preferences setup
3. **Player**: Profile completion and team joining, push notification subscription
4. **Verification**: Document and team verification, verification status notifications
5. **Public**: Information access and registration awareness, system announcements

### Tournament Phase
1. **Admin**: Overall tournament management and monitoring, broadcast notifications to all users
2. **Volunteer**: Match day operations and venue management, venue-specific team communications
3. **Captain/Player**: Match participation and coordination, real-time match notifications
4. **Public**: Live updates and result tracking, tournament announcements

### Post-Tournament Phase
1. **Admin**: Results compilation and analytics, final tournament notifications and certificates
2. **All Users**: Media sharing and tournament highlights, post-tournament feedback notifications
3. **System**: Data archival and reporting, notification analytics and cleanup

## Technical Implementation Notes

### Key Routes Structure
- `/[lang]/(auth)/login` - Authentication flow
- `/[lang]/admin/*` - Admin management interface
- `/[lang]/admin/notifications/*` - Admin notification management system
- `/[lang]/admin/notifications/create` - Create new notifications/broadcasts
- `/[lang]/admin/notifications/templates` - Manage notification templates
- `/[lang]/captain/*` - Captain team management
- `/[lang]/player/*` - Player dashboard and features
- `/[lang]/volunteer/*` - Volunteer operations (includes venue-based notifications)
- `/[lang]/verification/*` - Verification workflows
- `/[lang]/public/*` - Public information and registration

### Critical Components
- `AuthContext` - User authentication and role management
- `DocumentContext` - Document upload and verification
- `OfflineContext` - Offline functionality support
- `NotificationContext` - Real-time notification management
- `NotificationCenter` - In-app notification display and management
- `NotificationCreateModal` - Notification composition interface
- `NotificationDashboard` - Admin notification overview and analytics
- `VolunteerNotificationPanel` - Venue-based notification interface
- Various management components for each user role

### Key Features
- Multi-language support (`[lang]` parameter)
- Offline functionality with sync
- Real-time updates using Firestore listeners
- Role-based access control with notification permissions
- Comprehensive notification system with PWA push notifications
- Venue-based targeting for volunteer communications
- Template-based notification management
- Multi-channel delivery (in-app, push, background sync)
- Notification analytics and delivery tracking
- Comprehensive audit logging
- Media management with approval workflows
- Tournament bracket generation and management

## Security & Compliance

### User Data Protection
- Document verification with secure storage
- Personal information encryption
- Role-based access control
- Audit trail maintenance

### Tournament Integrity
- Team verification requirements
- Player eligibility validation
- Match result verification
- Anti-fraud measures

---

*This documentation serves as a comprehensive guide for understanding user interactions within the Isha Gramotsavam tournament management platform. Regular updates should be made as new features are added or existing workflows are modified.*