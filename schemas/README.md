# Isha Gramotsavam Database Schemas

This directory contains comprehensive database schema documentation for the Isha Gramotsavam sports management platform. Each schema file provides detailed structure, validation rules, usage examples, and implementation guidelines.

## 📋 Schema Overview

### Core Collections

1. **[users.md](./users.md)** - User Management System
   - Comprehensive user profiles with personal information
   - Document verification and eligibility tracking  
   - Panchayat-based geographic restrictions
   - Age verification and under-21 player limits
   - Role-based access control (admin, captain, player, volunteer)

2. **[sports.md](./sports.md)** - Sports Configuration
   - Detailed sport definitions with rules and eligibility
   - Tournament format and scoring systems
   - Prize distribution and recognition awards
   - Equipment and venue requirements
   - Registration fee and document requirements

3. **[teams.md](./teams.md)** - Team Management
   - Complete team composition and player management
   - Multi-level eligibility verification (age, geographic, documents)
   - Team size compliance and substitution tracking
   - Performance statistics and match history
   - Registration workflow and verification status

4. **[events.md](./events.md)** - Event Organization
   - Multi-level tournament structure (cluster → division → final)
   - Geographic eligibility and panchayat-based participation
   - Prize pools and recognition systems
   - Event timeline and scheduling management
   - Staff and official assignments

5. **[venues.md](./venues.md)** - Venue Management
   - Comprehensive facility information and capacity management
   - Court specifications and technical infrastructure
   - Safety protocols and emergency procedures
   - Operational scheduling and staff management
   - Quality ratings and user feedback systems

### Tournament and Match Management

6. **[fixtures.md](./fixtures.md)** - Tournament Fixtures
   - Complete tournament bracket management
   - Multi-format support (round-robin, knockout, hybrid)
   - Team seeding and draw management
   - Official assignments and logistics coordination
   - Media coverage and broadcasting schedules

7. **[matches.md](./matches.md)** - Match Management
   - Live scoring and real-time updates
   - Detailed player and team statistics
   - Match events and timeline tracking
   - Official decisions and disciplinary actions
   - Post-match analysis and reporting

### Media and Communications

8. **[media.md](./media.md)** - Media Management
   - Comprehensive file storage and categorization
   - Multi-platform social media integration
   - Content moderation and approval workflows
   - Analytics and engagement tracking
   - Rights management and legal compliance

9. **[notifications.md](./notifications.md)** - Notification System
   - Multi-channel delivery (email, SMS, push, WhatsApp)
   - Template management and personalization
   - Scheduling and automation workflows
   - Delivery tracking and engagement analytics
   - Compliance and opt-out management

### System Management

10. **[system-config.md](./system-config.md)** - System Configuration
    - Centralized platform settings and feature flags
    - Payment gateway and financial configurations
    - Security and privacy settings
    - Performance and monitoring configurations
    - Integration and API management

11. **[analytics.md](./analytics.md)** - Analytics and Reporting
    - Comprehensive business intelligence data
    - User behavior and engagement analytics
    - Financial and performance metrics
    - Geographic and demographic analysis
    - Predictive analytics and forecasting

12. **[audit-logs.md](./audit-logs.md)** - Audit and Compliance
    - Complete audit trail for all system activities
    - Security event monitoring and threat detection
    - Regulatory compliance (GDPR, CCPA)
    - Forensic capabilities and evidence management
    - Performance monitoring and optimization

## 🏗️ Architecture Highlights

### Multi-Level Tournament Structure
The platform supports a unique **cluster → division → final** tournament progression that reflects the panchayat-based participation model:

- **Cluster Level**: Local competitions within panchayats
- **Division Level**: Regional championships between cluster winners  
- **Final Level**: Grand finale with top teams from all divisions

### Geographic Eligibility System
- **Panchayat-based participation**: Teams must be from the same or nearby panchayats
- **Residence verification**: Required documents include panchayat certificates
- **Rural preference**: Priority given to rural and semi-urban participants
- **State-level restrictions**: Configurable allowed states and districts

### Age Management System
- **General age limits**: 16-35 years for all participants
- **Under-21 restrictions**: Maximum 3 players under 21 per team
- **Age verification**: Mandatory age proof documents
- **Eligibility calculation**: Age calculated from event start date

### Document Verification Workflow
- **Individual documents**: ID proof, age proof, medical certificates, panchayat certificates
- **Team documents**: Team photograph, captain documents, collective player documents
- **Verification stages**: Upload → Review → Approve/Reject → Corrections (if needed)
- **Audit trail**: Complete tracking of document handling and decisions

## 🔧 Key Features

### Real-time Capabilities
- Live match scoring and updates
- Real-time notifications across multiple channels
- Dynamic tournament bracket updates
- Live streaming integration

### Comprehensive Analytics
- User engagement and behavior tracking
- Financial performance monitoring
- Geographic participation analysis
- Predictive modeling for capacity planning

### Security and Compliance
- Complete audit logging for all activities
- GDPR and privacy regulation compliance
- Role-based access control with granular permissions
- Data encryption and secure storage

### Integration Support
- Payment gateway integrations (Razorpay, UPI, etc.)
- Social media platform integrations
- Email and SMS service providers
- Analytics and monitoring tools

## 📊 Data Relationships

### Core Entity Relationships
```
Events (1) ←→ (N) Sports ←→ (N) Teams ←→ (N) Users
Events (1) ←→ (N) Venues ←→ (N) Matches ←→ (2) Teams
Fixtures (1) ←→ (N) Matches ←→ (N) Media
Users (1) ←→ (N) Notifications ←→ (N) Analytics
```

### Key Foreign Key Relationships
- `teams.players[].userId` → `users.uid`
- `matches.teams.team1.id` → `teams.id`
- `fixtures.eventId` → `events.id`
- `venues.sportsSupported[]` → `sports.id`
- `notifications.context.eventId` → `events.id`

## 🚀 Implementation Guidelines

### Database Setup
1. **Firebase Firestore** as the primary database
2. **Firebase Storage** for media and document storage
3. **Firebase Authentication** for user management
4. **Cloud Functions** for serverless business logic

### Indexing Strategy
Critical indexes for performance:
```javascript
// Core queries
users: ['role', 'verificationStatus', 'address.panchayat']
teams: ['basicInfo.sport', 'verificationStatus.status', 'tournamentLevel']
matches: ['status', 'schedule.scheduledDate', 'venue.id']
events: ['status', 'startDate', 'sports']
venues: ['sportsSupported', 'status', 'location.city']
```

### Security Rules
Implement comprehensive Firestore security rules:
- Role-based access control
- Data ownership validation
- Geographic access restrictions
- Document verification requirements

### Data Validation
- Client-side validation for user experience
- Server-side validation for security
- Schema validation for data integrity
- Business rule validation for compliance

## 📈 Scalability Considerations

### Performance Optimization
- Strategic use of Firestore collections and subcollections
- Efficient pagination for large datasets
- Caching frequently accessed data
- Background processing for heavy operations

### Storage Optimization  
- Document size limits and field optimization
- Media compression and CDN distribution
- Archive old data to reduce active dataset size
- Implement data retention policies

### Cost Management
- Monitor read/write operations
- Optimize query patterns
- Use appropriate Firestore pricing tiers
- Implement data lifecycle management

## 🔍 Schema Validation

Each schema includes:
- **Required fields** with validation rules
- **Business logic constraints** for data integrity
- **Enum validations** for consistent data
- **Relationship validations** for referential integrity

## 📝 Documentation Standards

Each schema file follows this structure:
1. **Overview** - Purpose and scope
2. **Document Structure** - Complete TypeScript interface
3. **Sample Data** - Real-world examples
4. **Key Features** - Highlighting important capabilities
5. **Validation Rules** - Data integrity requirements
6. **Security Considerations** - Access control and privacy
7. **Usage Examples** - Code snippets for common operations
8. **Related Collections** - Data relationship mapping
9. **Indexes Required** - Performance optimization guidance

## 🤝 Contributing

When modifying schemas:
1. Update the corresponding `.md` file
2. Update related schema files for consistency
3. Test data migrations for existing data
4. Update validation rules and security policies
5. Document breaking changes and migration paths

## 📞 Support

For questions about the schema design or implementation:
- Review the specific schema documentation
- Check the implementation examples
- Refer to the Firebase Firestore documentation
- Contact the development team for clarification

---

*This schema documentation represents the comprehensive data model for the Isha Gramotsavam platform, designed to support rural sports festivals with panchayat-based participation, multi-level tournaments, and complete event management capabilities.*