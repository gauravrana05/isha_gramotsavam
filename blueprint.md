# Blueprint for Isha Gramotsavam Application

## Overview

The Isha Gramotsavam application aims to be a comprehensive, mobile-first platform for managing an annual rural sports festival. It will streamline event logistics, team and user management, match scheduling, media sharing, and provide real-time updates. The application prioritizes offline functionality and a simple, intuitive UI optimized for mobile devices, designed with a Material Design theme and the Roboto font for accessibility. The backend is built on Firebase, utilizing Firestore, Authentication, Cloud Storage, and Cloud Functions. Volunteers are assigned directly to venues, with access restricted to data tied to their assigned venues, determined by the venue’s venueType ("cluster", "division", "final").

## Detailed Outline of Project Features and Design

*   **User Management:**
    *   Roles: Players, Captains, Volunteers (general, technical), Admin, Guests, Public Users.
    *   Profiles: Aadhaar verification (Cloud Storage), profile photos, role-based permissions.
    *   Guests: VIP access, invitations, venue assignments.
    *   Volunteer Assignments: Volunteers assigned to venues via `assignedVenues` (Array<string> of `venueId`s) in the `users` collection. Access restricted to data (teams, fixtures, matches) linked to their assigned venues, based on `venueType` ("cluster", "division", "final"), enforced by Firestore security rules.
*   **Team Management:**
    *   Registration, verification, check-in.
    *   Sports and Categories (men, women, mixed) with configurable sizes.
    *   Historical participation tracking.
    *   Teams linked to venues via `venueId` for cluster-based organization.
*   **Event and Tournament Management:**
    *   Event details (deadlines, venues, sports configs).
    *   Tournament fixtures (knockout, league) with automated draw, linked to venues.
    *   Match scheduling, real-time scores, official assignments, with finals tracked via `round` (e.g., "semi_final", "final").
*   **Media Management:**
    *   Upload, categorize, share photos/videos (public/private).
    *   Engagement tracking (views, downloads, shares).
    *   Cloud Storage for media, Cloud Functions for thumbnails/links.
*   **Notifications:**
    *   Multi-channel (push, SMS, WhatsApp, email).
    *   Targeted delivery by user, team, role, or venue.
    *   Configurable priority.
*   **Analytics and Reporting:**
    *   Aggregated metrics (registrations, verifications, matches, media).
    *   Grouping by state, sport, venue, cluster, or division.
    *   System performance and user engagement.
*   **Offline Support:**
    *   Firestore offline persistence for critical operations.
    *   Incremental sync based on `updatedAt` timestamps.
    *   Configurable sync intervals.
*   **Security and Auditing:**
    *   Role-based access control (RBAC) via Firestore security rules, restricting volunteers to data tied to their `assignedVenues`.
    *   Audit logging of system actions.
    *   Secure storage of sensitive data (Aadhaar, API keys).
*   **UI/UX:**
    *   Mobile-first responsive design.
    *   Simple, uncluttered interfaces with large touch targets.
    *   Material Design theme:
        *   Color Palette: Primary: #FF6F00, Secondary: #4CAF50, Accent: #FFC107, Background: #F5F5F5.
        *   Typography: Roboto font (16px body, 20px headings, 14px captions, bold for emphasis).
        *   Components: Material Design components (cards, FABs, bottom navigation).
        *   Imagery: Rounded avatars, subtle shadows, vibrant media previews.
    *   Venue-based filters for volunteers to view data tied to their assigned venues (filtered by `venueType`).
    *   Accessibility (WCAG 2.1): Contrast ratio 4.5:1, screen reader support, localization (English, Tamil, Hindi, Malayalam, Telugu, Kannada, Odia).
*   **Technical:**
    *   Backend: Firebase Firestore (11 collections: users, teams, events, fixtures, matches, venues, media, notifications, analytics, systemConfig, auditLog).
    *   Authentication: Firebase Authentication (phone number login).
    *   Storage: Firebase Cloud Storage.
    *   Cloud Functions: Denormalization, analytics, notifications, media processing.
    *   Frontend: Next.js.
    *   Indexes: Composite/single-field for efficient queries.
    *   Scalability: Optimized for thousands of users/teams.
    *   Localization: English, Tamil, Hindi, Malayalam, Telugu, Kannada, Odia.
    *   Cluster/Division/Final Storage:
        *   Clusters: In `teams.cluster` (String), `fixtures.cluster` (String), linked to venues where `venueType` is "cluster".
        *   Divisions: In `fixtures.division` (String), `matches.division` (String), linked to venues where `venueType` is "division".
        *   Finals: In `matches.round` (String, e.g., "semi_final", "final"), linked to venues where `venueType` is "final".
        *   Locations: In venues with `venueType` (String: "cluster", "division", "final") and `location` (GeoPoint, address).

## Plan and Steps for Current Request

The user has provided the project goals and deliverables, incorporating the recent change to assign volunteers directly to venues, with access restricted to data tied to their assigned venues based on venueType ("cluster", "division", "final"). The logical progression is to continue building the foundational elements of the project, starting with the backend and data structure, and then moving to the frontend, ensuring volunteer access restrictions are implemented.

**Actionable Steps:**

1.  **Refine Firestore Security Rules:**
    *   Update Firestore security rules to restrict volunteer access to data (e.g., teams, fixtures, matches) where `venueId` matches the volunteer’s `assignedVenues` in the `users` collection.
    *   Ensure rules check `venueType` ("cluster", "division", "final") to align with organizational scope.
    *   Example rule for teams:
        ```plaintext
        match /teams/{teamId} {
          allow read, write: if request.auth != null && (
            get(/databases/$(database)/documents/teams/$(teamId)).data.captainId == request.auth.uid ||
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['volunteer_general', 'volunteer_technical', 'admin'] &&
            get(/databases/$(database)/documents/teams/$(teamId)).data.venueId in
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedVenues
          );
        }
        ```
2.  **Update Firestore Schema:**
    *   Modify the `users` collection to include `assignedVenues` (Array<string> of `venueId`s) for volunteers, removing any previous fields like `assignedClusters`, `assignedDivisions`, or `assignedFinals`.
    *   Update the `venues` collection to include `venueType` (String: "cluster", "division", "final") and ensure `location` (GeoPoint, address) is populated.
    *   Ensure `teams`, `fixtures`, and `matches` collections include `venueId` and denormalized `venue.venueType` for efficient queries.
3.  **Define Firestore Indexes:**
    *   Create composite indexes for venue-based queries, e.g.:
        *   `teams`: `venueId`, `status`
        *   `fixtures`: `venue.venueId`, `venueType`
        *   `matches`: `venue.venueId`, `round`
    *   Example index in `firestore.indexes.json`:
        ```json
        {
          "fieldOverrides": [],
          "indexes": [
            {
              "collectionGroup": "teams",
              "queryScope": "COLLECTION",
              "fields": [
                { "fieldPath": "venueId", "order": "ASCENDING" },
                { "fieldPath": "status", "order": "ASCENDING" }
              ]
            }
          ]
        }
        ```
4.  **Implement Core Cloud Functions:**
    *   Develop Cloud Functions for:
        *   User creation and role assignment upon authentication, including initializing `assignedVenues` for volunteers.
        *   Handling Aadhaar image uploads to Cloud Storage and updating user profiles.
        *   Generating thumbnails and shareable links for media uploads.
        *   Denormalizing venue data (e.g., copying `venueName`, `venueType` to `teams`, `fixtures`, `matches`).
        *   Validating volunteer venue assignments during data writes (e.g., ensuring volunteers only modify data for their assigned venues).
5.  **Set up Firebase Authentication:**
    *   Configure phone number authentication in Firebase and integrate with Next.js, linking authenticated users to the `users` collection with `assignedVenues` for volunteers.
6.  **Begin Core UI Component Development:**
    *   Build foundational UI components in Next.js using React and Tailwind CSS, adhering to Material Design and accessibility guidelines:
        *   Authentication/Login screens with phone number OTP.
        *   User profile display showing assigned venues for volunteers.
        *   Navigation components (e.g., bottom navigation for mobile).
        *   Card components for teams, matches, or media, with venue filters (e.g., dropdown for "cluster", "division", "final").
        *   Example: Update the `TeamCard` component to display `venueName` and `venueType`.
7.  **Implement Venue-Based Data Fetching:**
    *   Connect Next.js to Firestore to fetch data for volunteers, filtering by `assignedVenues`. Example query:
        ```javascript
        db.collection('teams')
          .where('venueId', 'in', user.assignedVenues)
          .get();
        ```
    *   Start with publicly accessible data (events, venues) and venue-specific data for volunteers.
8.  **Implement Basic Data Writing:**
    *   Develop functionality for users to update their profiles and for volunteers to perform venue-specific actions (e.g., team verification, match updates), validated by security rules.
9.  **Version Control and Deployment:**
    *   Set up Git for version control and configure a deployment pipeline using Firebase Hosting CLI or GitHub Actions for Next.js and Cloud Functions, enabling testing and previews.
