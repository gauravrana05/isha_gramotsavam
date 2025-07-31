# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Firebase Functions
```bash
# Build functions
cd src/lib/firebase/functions && npm run build

# Deploy functions only
firebase deploy --only functions

# Deploy security rules
firebase deploy --only firestore:rules,storage

# Deploy everything
firebase deploy

# View function logs
firebase functions:log
```

## Architecture Overview

### Application Structure
- **Next.js 15** with App Router and TypeScript
- **Firebase integration**: Auth, Firestore, Storage, Functions
- **Multi-language support**: 7 languages (en, ta, hi, ml, te, kn, or)
- **Role-based access control**: player, captain, volunteer (3 types), admin, guest, public
- **Event-based role management**: Temporary role elevation during events

### Key Directories
- `src/app/[lang]/` - Internationalized pages with language routing
- `src/components/` - Organized by domain (auth, teams, matches, etc.)
- `src/lib/firebase/` - Firebase configuration and service modules
- `src/lib/firebase/functions/` - Cloud Functions for backend logic
- `src/context/` - React contexts for global state
- `src/hooks/` - Custom hooks organized by domain

### Role-Based Routing
Pages are organized by user roles:
- `/[lang]/public/` - Public-facing pages
- `/[lang]/player/` - Player dashboard and features
- `/[lang]/captain/` - Team captain functionality
- `/[lang]/volunteer/` - Volunteer tools
- `/[lang]/admin/` - Administrative interfaces
- `/[lang]/verification/` - Verification workflows

### Firebase Functions Architecture
Critical functions for role management:
- `assignEventRole` - Manages event-based role elevation
- `promoteToTeamCaptain` - Elevates users to captain role
- `onTeamCreated` - Auto-triggers role promotion on team creation
- `expireEventRoles` - Resets roles after events

### State Management
- **AuthContext**: User authentication and profile management
- **LanguageContext**: Internationalization support
- **ThemeContext**: Theme switching
- **OfflineContext**: Offline capability management
- **NotificationContext**: Push notifications

### Data Models
Key Firestore collections:
- `users/` - User profiles with role and verification status
- `users/{uid}/eventRoles/` - Temporary event-based roles
- `teams/` - Team information and player rosters
- `teams/{id}/players/` - Team member subcollection
- `venues/`, `matches/`, `events/` - Sports management

### Component Architecture
Components follow domain-driven organization:
- **auth/**: Authentication and role management
- **teams/**: Team creation, management, verification
- **matches/**: Live scoring, scheduling, officials
- **venues/**: Venue management and assignment
- **verification/**: Document and team verification workflows
- **ui/**: Reusable UI components

### Internationalization
- Language detection via URL segment `/[lang]/`
- Locale files in `public/locales/` and `src/lib/locales/`
- LanguageContext provides translation utilities
- Middleware redirects root to `/en`

### Authentication Flow
1. Phone-based authentication via Firebase Auth
2. Profile completion with Aadhaar verification
3. Role assignment (defaults to 'public')
4. Event-based role elevation through Cloud Functions
5. Document verification for team participation

### File Upload System
- Profile photos and Aadhaar documents via Firebase Storage
- Cloud Functions for image processing and thumbnail generation
- Secure upload URLs with role-based access control

## Critical Implementation Notes

### Role Management
The application uses event-based temporary role elevation. Users start as 'public' and are elevated to 'captain' or 'player' during events, then reset afterward. This requires proper Cloud Function deployment.

### Security Rules
Firebase Security Rules enforce role-based access at the database level. Functions use admin SDK to bypass rules when necessary for role management.

### Offline Support
The application includes offline synchronization capabilities through OfflineContext and service worker registration.

### Mobile Optimization
PWA-ready with manifest.json, service worker, and mobile-responsive design using Tailwind CSS.