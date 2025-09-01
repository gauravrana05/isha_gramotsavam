# Isha Gramotsavam - Complete Project Context

## 🎯 Project Overview

**Isha Gramotsavam** is a comprehensive sports tournament management application designed to organize village-level sports competitions. The platform manages the complete tournament lifecycle from team registration to match scoring and media management.

### Current Status
- **Migration Phase**: Transitioning from Firebase to PostgreSQL + tRPC stack
- **Architecture**: Next.js 14 with App Router, TypeScript, Prisma ORM, tRPC API
- **Database**: PostgreSQL (Supabase) with comprehensive schema
- **Authentication**: Firebase Auth (transitioning)
- **Deployment**: Vercel with PWA capabilities

## 🏗️ Technical Architecture

### Core Stack
```
Frontend: Next.js 14 + TypeScript + Tailwind CSS
Backend: tRPC + Prisma ORM + PostgreSQL
Database: Supabase PostgreSQL
Authentication: Firebase Auth
Storage: Supabase Storage
Deployment: Vercel
PWA: next-pwa configuration
```

### Key Technologies
- **Next.js 14**: App Router with internationalization (`[lang]` routes)
- **TypeScript**: Full type safety across frontend and backend
- **Prisma**: Database ORM with comprehensive schema
- **tRPC**: Type-safe API with client-server communication
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Fira Sans**: Custom font family with multiple weights
- **PWA**: Progressive Web App with offline capabilities

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── [lang]/                   # Internationalized routes
│   │   ├── admin/               # Admin management interface
│   │   ├── captain/             # Team captain dashboard
│   │   ├── player/              # Player interface
│   │   ├── volunteer/           # Volunteer operations
│   │   ├── verification/        # Document verification
│   │   ├── public/              # Public information pages
│   │   ├── guest/               # Guest user interface
│   │   └── (auth)/              # Authentication routes
│   └── api/                     # API routes and tRPC endpoints
├── components/                   # Reusable UI components
│   ├── ui/                      # Core UI components
│   ├── forms/                   # Form components
│   └── modals/                  # Modal components
├── lib/                         # Utility libraries
│   ├── db.ts                    # Database connection
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Helper functions
├── server/                      # Server-side code
│   └── api/                     # tRPC routers and procedures
├── styles/                      # CSS and styling
│   ├── globals.css              # Global styles with design tokens
│   └── design-tokens.css        # Design system tokens
└── context/                     # React contexts
```

## 👥 User Roles & Permissions

### 1. Admin
**Complete system administration and oversight**
- System configuration and management
- User role management and assignments
- Tournament setup and event management
- Data oversight and analytics
- Audit log monitoring

### 2. Captain
**Team creation and management**
- Create and register teams for sports
- Recruit and manage team players
- Submit teams for verification
- View team fixtures and matches
- Team profile management

### 3. Player
**Participate in teams and tournaments**
- Complete personal profile and verification
- Join teams (via captain invitation)
- View team information and fixtures
- Upload media and match participation

### 4. General Volunteer
**Physical support at venue**
- On-ground venue support and logistics
- Physical setup and coordination
- Equipment management

### 5. Technical Volunteer
**Venue management and match day operations**
- Manage assigned venue operations
- Team check-in and verification
- Match day coordination
- Upload match media
- Advanced venue technical operations
- System maintenance and support
- Technical troubleshooting

### 6. Verification Volunteer
**Document and team verification**
- Verify player documents
- Team eligibility verification
- Profile verification approval
- Verification workflow management

### 7. Public/Guest Users
**Information access and initial registration**
- View public tournament information
- Access event schedules and results
- Initial account registration

## 🗄️ Database Schema Overview

### Core Entities

#### User Management
- **User**: Core user profiles with authentication
- **UserProfile**: Extended profile information
- **UserDocument**: Document verification system

#### Tournament Structure
- **Event**: Tournament events and competitions
- **Sport**: Available sports (Volleyball, Throwball, etc.)
- **Venue**: Competition venues and locations
- **VenueLevelMapping**: Venue assignments by tournament level

#### Team Management
- **Team**: Team registrations and information
- **TeamPlayer**: Player-team relationships
- **TeamVenueAssignment**: Team venue assignments
- **TeamPhoto**: Team media management

#### Competition System
- **Fixture**: Tournament fixtures and brackets
- **Match**: Individual matches and results
- **FixtureTeam**: Team-fixture relationships
- **FixtureResult**: Match results and scoring

#### Geographic System
- **LocationClusterMapping**: Geographic clustering
- **ClusterDivisionMapping**: Tournament divisions
- **VenueLevelMapping**: Venue level assignments

#### System Management
- **AuditLog**: System activity tracking
- **Notification**: User notifications
- **Post**: Content management system

### Key Relationships
- Users can be Captains of multiple Teams
- Teams belong to specific Sports and Events
- Teams are assigned to Venues through VenueLevelMapping
- Matches connect Teams through Fixtures
- Geographic hierarchy: Location → Cluster → Division → Final

### Team Venue Assignment Logic
**3-Tier Automatic Assignment System:**

**Tier 1: Location Mapping (Highest Priority)**
1. **District Mapping**: Check if team's district is mapped to a cluster venue
2. **Single Venue in District**: If only one cluster venue exists in team's district → auto-assign
3. **Taluk Mapping**: Check if team's taluk is mapped to a cluster venue

**Tier 2: District-Level Venues**
- Find all cluster venues in team's district
- **Single venue** → Auto-assign
- **Multiple venues** → Auto-assign to first available (with capacity check)

**Tier 3: Manual Assignment Required**
- If no suitable venues found → `requiresManualAssignment: true`
- Admin must manually assign the team

**Key Features:**
- **Capacity Check**: Each venue has `maxTeams` limit (default 50)
- **Priority Order**: District mapping → Single district venue → Taluk mapping → Multiple district venues → Manual
- **Assignment Method**: `auto_assigned` vs `manual_required`
- **No Random Assignment**: System doesn't randomly assign to any venue
- **Uses**: `LocationClusterMapping` for district/taluk mappings
- **Creates**: `TeamVenueAssignment` record with cluster level tracking

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--color-primary-500: #F28C38;  /* Isha Saffron */
--color-primary-600: #E67A26;  /* Darker Saffron */

/* Secondary Colors */
--color-secondary-100: #F5F5F5; /* Isha Cream */
--color-secondary-900: #4A3728; /* Isha Earth Brown */

/* Semantic Colors */
--color-success: #3A7F3F;      /* Forest Green */
--color-warning: #C79016;      /* Ochre */
--color-error: #AF0000;        /* Error Red */
--color-info: #1565C0;         /* Info Blue */
```

### Typography
- **Font Family**: Fira Sans (300, 400, 500, 600, 700 weights)
- **Font Loading**: Local font files with font-display: swap
- **Responsive**: Mobile-first typography scaling

### Component Standards
- **Buttons**: Consistent color scheme with hover/active states
- **Forms**: Standardized input styling with validation
- **Cards**: Consistent shadow and border radius
- **Modals**: EnhancedModal component with mobile optimization
- **Tables**: AdvancedTable with search, filter, sort capabilities

## 🔧 Core Components

### AdvancedTable
**Comprehensive table component with advanced features**
- Server-side and client-side data processing
- Search, filtering, sorting, pagination
- Row selection with bulk actions
- Export functionality
- Mobile-responsive design
- State persistence and saved views

### EnhancedModal
**Flexible modal system with mobile optimization**
- Responsive design (mobile fullscreen)
- Fixed footer with scrollable body
- Dynamic sizing (sm, base, lg, xl, full)
- Accessibility features
- Touch-friendly interactions

### Form Components
**Standardized form system**
- React Hook Form integration
- Zod validation schemas
- Consistent styling and error handling
- Mobile-optimized inputs

## 🚀 Development Patterns

### API Development (tRPC)
```typescript
// Router structure
export const appRouter = createTRPCRouter({
  users: usersRouter,
  teams: teamsRouter,
  fixtures: fixturesRouter,
  admin: adminRouter,
  volunteers: volunteersRouter,
  // ... other routers
});

// Procedure example
getUpcomingMatches: protectedProcedure
  .input(z.object({ limit: z.number().default(5) }))
  .query(async ({ input, ctx }) => {
    // Implementation
  });
```

### Page Migration Pattern
**Standardized migration from basic UI to AdvancedTable + EnhancedModal**
1. Remove translation dependencies
2. Implement AdvancedTable with proper columns/actions
3. Add EnhancedModal for CRUD operations
4. Create separate form components
5. Implement proper state management
6. Add mobile optimization

### State Management
```typescript
// Standard state pattern
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
const [showModal, setShowModal] = useState(false);
const [isEditMode, setIsEditMode] = useState(false);

// Mutation pattern
const createMutation = api.admin.createItem.useMutation({
  onSuccess: () => {
    refetch();
    addNotification('Success!', 'success');
    setShowModal(false);
  },
  onError: (error) => {
    addNotification(error.message, 'error');
  },
});
```

## 📱 Mobile Optimization

### Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Touch-friendly interactions (44px minimum touch targets)
- Optimized modal behavior (fullscreen on mobile)
- Simplified navigation and reduced cognitive load

### PWA Features
- Offline functionality with service worker
- App manifest for installation
- Cached resources for offline access
- Background sync capabilities

### Performance
- Image optimization with Next.js Image component
- Font optimization with local font files
- Code splitting with dynamic imports
- Lazy loading for non-critical components

## 🔐 Security & Authentication

### Authentication Flow
1. Firebase Auth for phone-based authentication
2. Profile completion verification
3. Role-based access control
4. Document verification workflow

### Authorization Patterns
```typescript
// Role-based protection
if (!['admin', 'volunteer'].includes(ctx.user.role)) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Insufficient permissions',
  });
}
```

### Data Security
- Input validation with Zod schemas
- SQL injection prevention with Prisma
- File upload security with type validation
- Audit logging for sensitive operations

## 🎯 User Journeys

### Team Registration Flow
1. **Captain Registration**: Phone auth → Profile completion → Role assignment
2. **Team Creation**: Sport selection → Team details → Geographic info
3. **Player Recruitment**: Invite players → Player profile completion → Document verification
4. **Team Verification**: Verification volunteer review → Approval/rejection
5. **Tournament Participation**: Venue assignment → Match scheduling → Results

### Match Day Operations
1. **Team Check-in**: Volunteer verification → Player attendance → Document checks
2. **Match Management**: Setup → Officials assignment → Score recording → Result submission
3. **Media Management**: Photo/video upload → Approval workflow → Public sharing

### Verification Workflow
1. **Document Upload**: Player submits required documents
2. **Queue Management**: Verification volunteer assignment
3. **Review Process**: Document verification → Decision → Status update
4. **Team Status**: Automatic team status updates based on player verification

## 🛠️ Development Guidelines

### Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Consistent code formatting and best practices
- **Prettier**: Automated code formatting
- **Conventional Commits**: Standardized commit messages

### Component Development
- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Prefer composition over inheritance
- **Props Interface**: Clear TypeScript interfaces for all props
- **Error Boundaries**: Proper error handling and user feedback

### API Development
- **Type Safety**: Full type safety with tRPC
- **Input Validation**: Zod schemas for all inputs
- **Error Handling**: Consistent error responses
- **Documentation**: Clear procedure descriptions

## 📊 Current Migration Status

### Completed
✅ **Database Schema**: Complete Prisma schema with all entities
✅ **Core Components**: AdvancedTable, EnhancedModal, Form components
✅ **Admin Interface**: Most admin pages migrated to new pattern
✅ **Authentication**: Firebase Auth integration
✅ **API Structure**: tRPC routers and procedures
✅ **Design System**: Comprehensive design tokens and styling

### In Progress
🔄 **Page Migrations**: Converting remaining pages to AdvancedTable pattern
🔄 **API Completion**: Implementing remaining tRPC procedures
🔄 **Mobile Optimization**: Fine-tuning mobile experience
🔄 **Testing**: Comprehensive testing implementation

### Pending
⏳ **Performance Optimization**: Bundle size and loading optimization
⏳ **Offline Functionality**: Complete PWA offline capabilities
⏳ **Analytics**: User behavior and system analytics
⏳ **Documentation**: Complete API and component documentation

## 🚨 Common Issues & Solutions

### TypeScript Errors
- **Missing Relations**: Ensure Prisma relations are properly defined
- **Type Mismatches**: Use proper type assertions and validation
- **Import Issues**: Check import paths and module resolution

### Performance Issues
- **Large Datasets**: Use server-side pagination and filtering
- **Bundle Size**: Implement code splitting and lazy loading
- **Database Queries**: Optimize with proper indexing and query structure

### Mobile Issues
- **Touch Targets**: Ensure minimum 44px touch targets
- **Modal Behavior**: Use mobileFullScreen for complex modals
- **Form Inputs**: Prevent zoom with proper font sizes

## 📚 Documentation References

### Internal Guides
- **USER_JOURNEYS.md**: Complete user workflow documentation
- **page_migration_guide.md**: Step-by-step migration process
- **Advanced_table_guide.md**: AdvancedTable usage and configuration
- **enhanced_modal_guide.md**: EnhancedModal implementation patterns
- **MULTISELECT_EDIT_GUIDE.md**: Multi-select form handling

### External Resources
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **tRPC Documentation**: https://trpc.io/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## 🎯 Success Metrics

### Technical Metrics
- **Type Safety**: 100% TypeScript coverage
- **Performance**: Core Web Vitals optimization
- **Mobile Experience**: Touch-friendly interactions
- **Accessibility**: WCAG compliance

### User Experience Metrics
- **Registration Completion**: Streamlined onboarding flow
- **Tournament Management**: Efficient admin operations
- **Match Day Operations**: Smooth volunteer workflows
- **Data Integrity**: Accurate tournament data and results

## 🔮 Future Roadmap

### Short Term (1-3 months)
- Complete page migrations to AdvancedTable pattern
- Implement remaining tRPC procedures
- Mobile optimization and PWA enhancements
- Comprehensive testing suite

### Medium Term (3-6 months)
- Advanced analytics and reporting
- Real-time match updates
- Enhanced media management
- Performance optimization

### Long Term (6+ months)
- Multi-tournament support
- Advanced tournament bracket generation
- Integration with external sports APIs
- Mobile app development

---

*This context document serves as the comprehensive guide for understanding and developing the Isha Gramotsavam tournament management platform. It should be updated as the project evolves and new features are added.*
