# AI Agent Prompt: Create Captain Guide Page

## Task
Create a comprehensive interactive guide page for Team Captains in the Isha Gramotsavam tournament management system.

## Implementation Requirements

### 1. Route Structure
Create the following files:
- `src/app/[lang]/captain/guide/page.tsx` - Main guide page
- Update captain navigation to include guide link

### 2. Guide Structure (Based on Volunteer Guide Pattern)
Follow the existing volunteer guide implementation pattern with these sections:

#### Pre-Tournament Phase
- **Team Registration**: Step-by-step team creation process
- **Player Recruitment**: How to invite and add team members  
- **Document Collection**: Gathering player verification documents
- **Team Profile Setup**: Completing team information and photos

#### Registration Phase  
- **Player Verification**: Monitoring player approval status
- **Team Status Tracking**: Understanding verification workflow
- **Communication**: Staying in touch with team members
- **Deadline Management**: Key dates and requirements

#### Match Day Phase
- **Team Check-in**: Arriving at venue and checking in team
- **Player Lineup**: Confirming playing squad for matches
- **Match Coordination**: Working with volunteers and officials
- **Result Tracking**: Viewing match results and standings

#### Post-Match Phase
- **Performance Review**: Accessing match statistics
- **Next Match Prep**: Preparing for upcoming fixtures
- **Team Management**: Ongoing team administration
- **Tournament Progress**: Tracking advancement through rounds

### 3. Interactive Features
- **Progress Tracking**: Checkboxes for completed steps
- **App Navigation**: Direct links to relevant app sections
- **Time Estimates**: Duration for each task
- **Status Indicators**: Visual progress indicators
- **Expandable Sections**: Collapsible guide sections

### 4. Key App Integrations
Link to these captain app sections:
- `/[lang]/captain/dashboard` - Main dashboard
- `/[lang]/captain/teams` - Team management
- `/[lang]/captain/fixtures` - Match schedule
- `/[lang]/captain/matches` - Match results
- `/[lang]/profile/complete` - Profile completion

### 5. Content Guidelines
- **Clear Instructions**: Step-by-step actionable guidance
- **Visual Hierarchy**: Use icons and proper heading structure
- **Mobile Friendly**: Responsive design for mobile use
- **Contextual Help**: Relevant tips and warnings
- **Success Criteria**: Clear completion indicators

### 6. Technical Implementation
- Use TypeScript with proper interfaces
- Follow existing component patterns
- Include proper error handling
- Add loading states where needed
- Implement proper accessibility (ARIA labels, keyboard navigation)

### 7. Content Tone
- **Encouraging**: Motivate captains to complete tasks
- **Clear**: Simple, jargon-free instructions  
- **Comprehensive**: Cover all captain responsibilities
- **Practical**: Focus on actionable steps
- **Supportive**: Provide help and contact information

## Expected Deliverables
1. Complete React component for captain guide page
2. Navigation integration
3. Responsive CSS styling
4. TypeScript interfaces
5. Accessibility compliance
6. Mobile optimization

## Reference Implementation
Study the volunteer guide at `src/app/[lang]/volunteer/venues/[venueId]/guide/page.tsx` for:
- Component structure and patterns
- Interactive features implementation
- Styling and layout approach
- State management for progress tracking
- Integration with app navigation

Create a captain-specific version that addresses the unique needs and workflows of team captains in the tournament system.
