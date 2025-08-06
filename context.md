# Isha Gramotsavam - Project Context & Implementation Guide

## Project Overview

Isha Gramotsavam is a comprehensive sports tournament management system built with Next.js 15, TypeScript, and Firebase. The application manages rural sports tournaments with multiple user roles, match management, team registration, and volunteer coordination.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Firebase Firestore, Firebase Functions, Firebase Storage
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom component library with mobile-first design
- **Internationalization**: Multi-language support (en, hi, ta, te, ml, kn, or)

## Architecture Overview

### Directory Structure
```
src/
├── app/                     # Next.js App Router pages
│   └── [lang]/             # Internationalized routes
│       ├── (auth)/         # Authentication pages
│       ├── admin/          # Admin dashboard and management
│       ├── captain/        # Team captain interface
│       ├── player/         # Player dashboard
│       ├── public/         # Public-facing pages
│       ├── verification/   # Document verification
│       └── volunteer/      # Volunteer interface
├── components/             # Reusable UI components
│   ├── ui/                # Base UI components
│   ├── admin/             # Admin-specific components
│   ├── auth/              # Authentication components
│   ├── common/            # Common/shared components
│   ├── dashboard/         # Dashboard components
│   ├── forms/             # Form components
│   ├── navigation/        # Navigation components
│   └── public/            # Public page components
├── context/               # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and utilities
│   ├── actions/           # Server actions
│   ├── firebase/          # Firebase configuration and services
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
└── styles/                # CSS styles
```

## Core Components Library

### Base UI Components (`src/components/ui/`)

#### Button Component (`Button.tsx`)
**Status**: ✅ Working properly
- **Location**: `src/components/ui/Button.tsx:89-148`
- **Variants**: primary, secondary, outline, ghost, danger, success
- **Sizes**: sm (32px), base (44px), lg (48px), xl (56px)
- **Features**: Loading states, icons, full width, rounded corners
- **Named exports**: PrimaryButton, SecondaryButton, OutlineButton, etc.

```tsx
// Usage Examples
<Button variant="primary" size="lg">Register Now</Button>
<PrimaryButton loading loadingText="Submitting...">Submit</PrimaryButton>
<IconButton icon={Plus} aria-label="Add item" />
```

#### Other UI Components
- **Card** (`Card.tsx`): Layout containers with header/body/footer
- **Container** (`Container.tsx`): Responsive content containers
- **Input** (`Input.tsx`): Form input fields with validation
- **Modal** (`Modal.tsx`): Overlay dialogs and popups
- **DataTable** (`DataTable.tsx`): Responsive data tables
- **LoadingSpinner** (`LoadingSpinner.tsx`): Loading indicators
- **EmptyState** (`EmptyState.tsx`): Empty state placeholders

### Design System

#### Design Tokens (`src/lib/design-tokens.ts`)
- **Colors**: Primary (F28C38), Secondary, Success, Error, Warning
- **Typography**: Fira Sans font family with fluid scaling
- **Spacing**: 4px base unit system
- **Breakpoints**: Mobile-first (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Touch Targets**: Minimum 44px for accessibility

#### Component Patterns (`src/lib/component-patterns.ts`)
- **cn()**: Class name utility function
- **focusClasses**: Consistent focus styles
- **disabledClasses**: Disabled state styling
- **colorClasses**: Semantic color system
- **createVariantClasses()**: Variant class generator

#### Responsive Utilities (`src/lib/responsive-utils.ts`)
- **Mobile-first approach**: All components are mobile-optimized
- **Touch-friendly**: 44px+ touch targets
- **Fluid typography**: Scales from mobile to desktop
- **Media queries**: Touch device detection, orientation

## Server Actions

### Location: `src/lib/actions/`

#### Admin Actions
- **`admin/optimizedDashboardQueries.ts`**: Dashboard data fetching
- **`admin/optimizedTeamQueries.ts`**: Team management queries
- **`admin/volunteerManagement.ts`**: Volunteer assignment and management
- **`admin/venueMapping.ts`**: Venue location mapping
- **`admin/teamVenueAssignment.ts`**: Team-venue assignments

#### Captain Actions
- **`captain/createTeamOptimized.ts`**: Team creation with validation
- **`captain/addPlayerToTeam.ts`**: Add players to teams
- **`captain/removePlayerFromTeam.ts`**: Remove players from teams
- **`captain/submitTeam.ts`**: Submit team for verification

#### Tournament Actions
- **`tournament/fixtureManagement.ts`**: Tournament bracket management
- **`tournament/matchManagement.ts`**: Match scheduling and updates
- **`tournament/matchResultsTransactional.ts`**: Match result recording

#### Verification Actions
- **`verification/verifyPlayer.ts`**: Player document verification
- **`verification/verifyTeam.ts`**: Team verification workflow
- **`verification/verificationActions.ts`**: General verification utilities

#### Volunteer Actions
- **`volunteer/teamCheckin.ts`**: Team check-in processes
- **`volunteer/matchDayVerification.ts`**: Match day verification

## User Roles & Permissions

### Role Types
1. **Admin**: Full system access, user management, tournament setup
2. **Captain**: Team management, player registration
3. **Player**: Profile management, team participation
4. **Volunteer**: Venue management, match day operations
5. **Verification**: Document and team verification
6. **Guest**: Public access to tournament information

### Role-based Routing
- Each role has dedicated dashboard and functionality
- Protected routes with `RoleGuard` component
- Role-specific navigation and sidebars

## Firebase Integration

### Services (`src/lib/firebase/`)
- **`config.ts`**: Firebase initialization
- **`auth.ts`**: Authentication service
- **`firestore/`**: Database collections and queries
- **`storage.ts`**: File upload and management
- **`functions/`**: Cloud Functions for server-side logic

### Database Collections
- **users**: User profiles and roles
- **teams**: Team registration and management
- **venues**: Tournament venues and facilities
- **matches**: Match scheduling and results
- **fixtures**: Tournament brackets and draws
- **media**: Images and documents
- **notifications**: System notifications

## Development Guidelines

### Component Creation
1. **Use design tokens**: Import from `@/lib/design-tokens`
2. **Mobile-first**: Design for 320px+ screens
3. **Accessibility**: Include proper ARIA labels and focus management
4. **TypeScript**: Use proper type definitions from `@/lib/types/`
5. **Error boundaries**: Wrap components with error handling

### Styling Guidelines
1. **Tailwind classes**: Use utility classes with design tokens
2. **Custom components**: Follow component patterns
3. **Responsive design**: Use mobile-first breakpoints
4. **Touch targets**: Minimum 44px for interactive elements

### State Management
1. **React Context**: For global state (auth, theme, language)
2. **Custom hooks**: For component-specific logic
3. **Server actions**: For data mutations
4. **Firebase listeners**: For real-time updates

## Common Implementation Patterns

### Form Handling
```tsx
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function MyForm() {
  return (
    <form>
      <Input
        label="Team Name"
        required
        error={errors.teamName}
      />
      <Button type="submit" loading={isSubmitting}>
        Submit Team
      </Button>
    </form>
  )
}
```

### Data Fetching with Server Actions
```tsx
import { getTeams } from '@/lib/actions/admin/optimizedTeamQueries'

async function TeamsPage() {
  const teams = await getTeams()
  
  return (
    <div>
      {teams.map(team => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  )
}
```

### Role-based Access
```tsx
import { RoleGuard } from '@/components/auth/RoleGuard'

function AdminOnly() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminDashboard />
    </RoleGuard>
  )
}
```

### Loading States
```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

function DataList({ data, loading, error }) {
  if (loading) return <LoadingSpinner />
  if (error) return <EmptyState message="Failed to load data" />
  if (!data?.length) return <EmptyState message="No data found" />
  
  return <DataDisplay data={data} />
}
```

## Testing & Deployment

### Build Process
- **Development**: `npm run dev` (uses Turbopack)
- **Build**: `npm run build` (production build with static generation)
- **Linting**: `npm run lint` (ESLint with Next.js config)

### Firebase Integration
- **Functions**: Deploy with `npm run firebase:init`
- **Sports Data**: Initialize with `npm run firebase:sports`
- **Security Rules**: Located in `firestore.rules` and `storage.rules`

## Known Issues & Solutions

### Primary Button Issue: ✅ RESOLVED
The primary button was reported as not working, but investigation shows:
- ✅ Button component is properly implemented
- ✅ All variants (including primary) are working
- ✅ Tailwind config includes all primary color classes
- ✅ Build completes successfully without errors
- ✅ HeroSection.tsx uses Button correctly

The issue may have been resolved or was related to:
- Missing Tailwind CSS classes in safelist (now included)
- Design token integration (now properly configured)
- Component import paths (now correctly structured)

## Future Improvements

1. **Performance**: Implement code splitting for role-based chunks
2. **Accessibility**: Add more comprehensive ARIA support
3. **Testing**: Add unit and integration tests
4. **Monitoring**: Implement error tracking and analytics
5. **PWA**: Add offline functionality for mobile users

## Getting Started for New Developers

1. **Install dependencies**: `npm install`
2. **Set up environment**: Copy `.env.example` to `.env.local`
3. **Configure Firebase**: Update Firebase config in `src/lib/firebase/config.ts`
4. **Run development server**: `npm run dev`
5. **Review this context**: Understand the architecture and patterns
6. **Check component library**: Start with `src/components/ui/` components
7. **Follow conventions**: Use design tokens and component patterns