# AI Agent Prompt: Create Player Guide Page

## Task
Create a comprehensive interactive guide page for Players in the Isha Gramotsavam tournament management system.

## Implementation Requirements

### 1. Route Structure
Create the following files:
- `src/app/[lang]/player/guide/page.tsx` - Main guide page
- Update player navigation to include guide link

### 2. Guide Structure (Based on Volunteer Guide Pattern)
Follow the existing volunteer guide implementation pattern with these sections:

#### Getting Started
- **Profile Setup**: Complete personal profile and verification
- **Document Preparation**: Required documents and photo guidelines
- **Account Verification**: Understanding the verification process
- **App Navigation**: Familiarizing with player dashboard

#### Team Participation
- **Finding Teams**: How to search and join existing teams
- **Team Invitations**: Responding to captain invitations
- **Team Requirements**: Understanding sport-specific requirements
- **Communication**: Staying connected with team and captain

#### Verification Process
- **Document Upload**: Step-by-step document submission
- **Photo Guidelines**: Proper photo requirements and tips
- **Verification Status**: Understanding approval workflow
- **Common Issues**: Troubleshooting verification problems

#### Match Preparation
- **Schedule Viewing**: Checking match fixtures and timings
- **Venue Information**: Finding match locations and directions
- **Team Coordination**: Communicating with teammates
- **Match Day Checklist**: What to bring and expect

#### During Tournament
- **Check-in Process**: Arriving at venue and team check-in
- **Match Participation**: Understanding match procedures
- **Result Tracking**: Viewing match results and statistics
- **Tournament Progress**: Following team advancement

#### Post-Tournament
- **Performance Review**: Accessing personal and team statistics
- **Feedback**: Providing tournament feedback
- **Future Events**: Information about upcoming tournaments
- **Community**: Staying connected with Isha sports community

### 3. Interactive Features
- **Progress Tracking**: Checkboxes for completed steps
- **App Navigation**: Direct links to relevant app sections
- **Visual Guides**: Screenshots or illustrations for complex steps
- **Status Indicators**: Clear progress visualization
- **Quick Actions**: One-click access to common tasks

### 4. Key App Integrations
Link to these player app sections:
- `/[lang]/player/dashboard` - Main dashboard
- `/[lang]/player/teams` - Team information
- `/[lang]/player/matches` - Match schedule and results
- `/[lang]/profile/complete` - Profile completion
- `/[lang]/public/sports` - Available sports information

### 5. Content Guidelines
- **Beginner Friendly**: Assume no prior tournament experience
- **Visual Learning**: Use icons, colors, and visual cues
- **Step-by-Step**: Break complex processes into simple steps
- **Encouraging**: Motivate participation and completion
- **Helpful**: Provide tips and best practices

### 6. Special Considerations for Players
- **First-Time Users**: Many players may be new to digital tournaments
- **Mobile Focus**: Players primarily use mobile devices
- **Offline Capability**: Some features work offline
- **Multilingual**: Support for multiple languages
- **Accessibility**: Consider users with varying technical skills

### 7. Technical Implementation
- Use TypeScript with proper interfaces
- Follow existing component patterns
- Include proper error handling
- Add loading states where needed
- Implement proper accessibility
- Optimize for mobile performance

### 8. Content Tone
- **Welcoming**: Make players feel included and supported
- **Simple**: Use clear, non-technical language
- **Positive**: Emphasize the fun and community aspects
- **Practical**: Focus on what players need to do
- **Reassuring**: Address common concerns and fears

## Expected Deliverables
1. Complete React component for player guide page
2. Navigation integration
3. Mobile-first responsive design
4. TypeScript interfaces
5. Accessibility compliance
6. Offline-friendly features

## Reference Implementation
Study the volunteer guide at `src/app/[lang]/volunteer/venues/[venueId]/guide/page.tsx` for:
- Component structure and patterns
- Interactive features implementation
- Styling and layout approach
- State management for progress tracking
- Integration with app navigation

Create a player-specific version that addresses the unique needs and concerns of individual players participating in the tournament system.
