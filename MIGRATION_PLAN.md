# Isha Gramotsavam - Migration Plan: Firebase to PostgreSQL and tRPC

## 1. Introduction

This document outlines the detailed migration plan for the Isha Gramotsavam application, moving from a Firebase-based backend to a more robust and scalable solution using PostgreSQL and tRPC. The primary goal is to improve data integrity, performance, and maintainability while retaining and enhancing the existing functionality.

This plan is divided into sections based on the application's frontend pages, as organized in the `src/app/[lang]` directory. Each section will provide a detailed analysis of the page, the required tRPC routers and database tables, the implementation approach, the impact of the changes, and any dependencies.

**Guiding Principles for Migration:**

*   **Phased Approach:** The migration will be conducted in phases, starting with the public-facing pages and progressing to more complex, role-specific functionalities.
*   **Data Integrity:** Ensuring a seamless and accurate migration of existing data from Firebase to PostgreSQL is a top priority.
*   **Minimal Disruption:** The migration will be planned to minimize disruption to users, with a focus on maintaining a consistent user experience.
*   **Code Quality:** The new implementation will adhere to high standards of code quality, including clear documentation, comprehensive testing, and adherence to best practices.

## 2. Public Pages (`/src/app/[lang]/public`)

The public-facing pages are the first point of contact for most users. They provide information about the tournament, sports, and registration. The migration of these pages will focus on replacing any remaining Firebase dependencies with tRPC and PostgreSQL.

### 2.1. Main Public Page (`/public/page.tsx`)

*   **Analysis:** This page serves as the main landing page for the public section. It is composed of several smaller components, most of which are static. The `SportsPreview.tsx` component is the only one that currently fetches dynamic data.
*   **Current Implementation:** The `SportsPreview.tsx` component uses `api.sports.getAllWithCategories.useQuery()` to fetch a list of sports. This is already using tRPC and PostgreSQL, so no migration is needed for this specific data fetching logic.
*   **Migration Plan:**
    *   **Authentication:** The `SportsPreview.tsx` component uses the `useAuth` hook to get the user's gender for registration validation. This dependency on the Firebase-based `AuthContext` needs to be removed.
        *   **tRPC Router:** A new tRPC procedure, `users.getPublicProfile`, will be created to fetch the public profile information of the currently logged-in user, including their gender. This procedure will be called in the `SportsPreview.tsx` component.
        *   **Database Tables:** The `users` table will be used to fetch the user's gender.
        *   **Implementation:**
            1.  Create the `users.getPublicProfile` tRPC procedure in `src/server/api/routers/users.ts`. This procedure will take the user's ID as input and return their public profile information.
            2.  In `SportsPreview.tsx`, replace the `useAuth` hook with a call to `api.users.getPublicProfile.useQuery()`.
            3.  The user's gender will be retrieved from the result of the tRPC query and used for registration validation.
    *   **Static Components:** The other components on this page (`HeroSection`, `QuoteSection`, etc.) are static and do not require any data fetching. No migration is needed for these components.
*   **Impact:**
    *   The `SportsPreview.tsx` component will be decoupled from the Firebase-based `AuthContext`.
    *   The authentication logic will be centralized in the tRPC API.
*   **Dependencies:**
    *   The `users.getPublicProfile` tRPC procedure must be implemented before the `SportsPreview.tsx` component can be migrated.

### 2.2. About Page (`/public/about/page.tsx`)

*   **Analysis:** This page provides general information about the Isha Gramotsavam tournament.
*   **Current Implementation:** The page is entirely static, with all content hardcoded in the component.
*   **Migration Plan:** No migration is needed for this page. The content will remain static.
*   **Impact:** None.
*   **Dependencies:** None.

### 2.3. Events Pages (`/public/events/page.tsx` and `/public/events/[eventId]/page.tsx`)

*   **Analysis:** These pages are intended to display information about tournament events.
*   **Current Implementation:** Both pages are currently placeholders and do not contain any functionality.
*   **Migration Plan:** These pages need to be implemented from scratch using tRPC and PostgreSQL.
    *   **`events/page.tsx` (List of Events):**
        *   **tRPC Router:** A new tRPC procedure, `events.getAllPublic`, will be created to fetch a list of all public events.
        *   **Database Tables:** The `events` table will be queried to retrieve the list of events.
        *   **Implementation:**
            1.  Create the `events.getAllPublic` tRPC procedure in a new file, `src/server/api/routers/events.ts`. This procedure will return a list of all events with a `status` of `registration_open` or `active`.
            2.  In `events/page.tsx`, use `api.events.getAllPublic.useQuery()` to fetch the list of events.
            3.  Display the events in a user-friendly format, such as a list or a grid of cards.
    *   **`events/[eventId]/page.tsx` (Event Details):**
        *   **tRPC Router:** A new tRPC procedure, `events.getPublicById`, will be created to fetch the details of a specific event.
        *   **Database Tables:** The `events` table will be queried to retrieve the details of the event. The `sports`, `venues`, and `fixtures` tables may also be queried to provide additional information.
        *   **Implementation:**
            1.  Create the `events.getPublicById` tRPC procedure in `src/server/api/routers/events.ts`. This procedure will take the event ID as input and return the event details.
            2.  In `events/[eventId]/page.tsx`, use `api.events.getPublicById.useQuery()` to fetch the event details.
            3.  Display the event details, including the event name, description, dates, and a list of associated sports, venues, and fixtures.
*   **Impact:**
    *   The event pages will be fully functional, providing users with up-to-date information about the tournament.
    *   The event data will be managed in the PostgreSQL database.
*   **Dependencies:**
    *   The `events` tRPC router and its procedures must be implemented before the event pages can be built.

### 2.4. Team Registration Page (`/public/register/team/[sport]/page.tsx`)

*   **Analysis:** This page allows users to register a new team for a specific sport.
*   **Current Implementation:** This page is already partially migrated and uses tRPC for several actions:
    *   `api.teams.createAndPromoteCaptain.useMutation()`
    *   `api.sports.getByIdOrName.useQuery()`
    *   `api.profile.checkCompletion.useQuery()`
    The page still uses the `useAuth` hook for user authentication.
*   **Migration Plan:**
    *   **Authentication:** The `useAuth` hook needs to be replaced with a tRPC-based solution.
        *   **tRPC Router:** The `users.getPublicProfile` procedure (mentioned in section 2.1) will be used to get the current user's profile information.
        *   **Database Tables:** The `users` table will be used to fetch the user's profile.
        *   **Implementation:**
            1.  **COMPLETED:** In `TeamRegistrationPage`, replaced the `useAuth` hook with a call to `api.users.getPublicProfile.useQuery()`. Updated `sportQuery` to use `userProfileData?.gender` and the `useEffect` hook to use `userProfileData` instead of `user` and `userProfile`.
            2.  The user's authentication status and profile information will be retrieved from the result of the tRPC query.
            3.  The rest of the page logic, which is already using tRPC, will remain the same.
*   **Impact:**
    *   The team registration page will be fully migrated to the new stack.
    *   The authentication logic will be consistent with the rest of the application.
*   **Dependencies:**
    *   The `users.getPublicProfile` tRPC procedure must be implemented.

### 2.5. Sports Pages (`/public/sports/page.tsx` and `/public/sports/[sportId]/page.tsx`)

*   **Analysis:** These pages provide information about the sports offered in the tournament.
*   **Current Implementation:** These pages are already partially migrated and use tRPC to fetch sports data:
    *   `api.sports.getAllWithCategories.useQuery()`
    *   `api.sports.getByIdOrName.useQuery()`
    They still use the `useAuth` hook for user authentication and gender-based validation.
*   **Migration Plan:**
    *   **Authentication:** The `useAuth` hook needs to be replaced with a tRPC-based solution.
        *   **tRPC Router:** The `users.getPublicProfile` procedure will be used to get the current user's profile information.
        *   **Database Tables:** The `users` table will be used to fetch the user's profile.
        *   **Implementation:**
            1.  **COMPLETED:** In `sports/page.tsx`, replaced the `useAuth` hook with a call to `api.users.getPublicProfile.useQuery()`.
            2.  **COMPLETED:** In `sports/[sportId]/page.tsx`, replaced the `useAuth` hook with a call to `api.users.getPublicProfile.useQuery()`.
            3.  The user's gender will be retrieved from the result of the tRPC query and used for registration validation.
*   **Impact:**
    *   The sports pages will be fully migrated to the new stack.
    *   The authentication logic will be consistent with the rest of the application.
*   **Dependencies:**
    *   The `users.getPublicProfile` tRPC procedure must be implemented.

### 2.6. Sport Rules Page (`/public/sports/[sportId]/rules/page.tsx`)

*   **Analysis:** This page displays the rules for a specific sport.
*   **Current Implementation:** This page uses `api.sports.getByIdOrName.useQuery()` to fetch sport-specific data, which is then used to display a mix of dynamic and static rules. It does not have a direct dependency on `useAuth`.
*   **Migration Plan:** No migration is needed for this page, as it is already using tRPC for data fetching and does not have any Firebase dependencies.
*   **Impact:** None.
*   **Dependencies:** None.

## 3. Verification Pages (`/src/app/[lang]/verification`)

The verification pages are used by verification volunteers and admins to review and verify teams and players. This section is critical for the tournament's integrity and requires a complete migration from Firebase to tRPC and PostgreSQL.

### 3.1. Verification Layout (`/verification/layout.tsx`)

*   **Analysis:** This layout component wraps all the verification pages. It handles authentication and authorization, ensuring that only authorized users can access this section.
*   **Current Implementation:** It uses the `useAuth` hook for user authentication and a `useRedirect` hook for role-based authorization.
*   **Migration Plan:**
    *   **Authentication and Authorization:** The `useAuth` and `useRedirect` hooks will be replaced with a single tRPC query.
        *   **tRPC Router:** A new tRPC procedure, `users.getVerificationProfile`, will be created. This procedure will fetch the user's profile and roles from the database and will be protected to ensure that only authenticated users can access it. It will also check if the user has the `verification_volunteer` or `admin` role and throw an error if they don't.
        *   **Database Tables:** The `users` table will be used to fetch the user's profile and roles.
        *   **Implementation:**
            1.  Create the `users.getVerificationProfile` tRPC procedure in `src/server/api/routers/users.ts`.
            2.  **COMPLETED:** In `VerificationLayout`, replaced the `useAuth` and `useRedirect` hooks with a call to `api.users.getVerificationProfile.useQuery()`.
            3.  The query will handle the redirection logic on the server-side, returning an error if the user is not authorized. The frontend will then handle this error by displaying an appropriate message or redirecting the user to the login page.
*   **Impact:**
    *   The authentication and authorization logic will be centralized in the tRPC API.
    *   The layout will be decoupled from the Firebase-based `AuthContext`.
*   **Dependencies:**
    *   The `users.getVerificationProfile` tRPC procedure must be implemented.

### 3.2. Verification Dashboard (`/verification/dashboard/page.tsx`)

*   **Analysis:** This page displays a list of teams that have been submitted for verification.
*   **Current Implementation:** It directly uses the Firebase SDK to query the `teams` collection in Firestore.
*   **Migration Plan:**
    *   **Data Fetching:** The entire data fetching logic will be moved to a tRPC procedure.
        *   **tRPC Router:** A new tRPC procedure, `teams.getForVerification`, will be created. This procedure will handle fetching, pagination, searching, and filtering of teams on the server-side.
        *   **Database Tables:** The `teams` and `users` tables will be used.
        *   **Implementation:**
            1.  Create the `teams.getForVerification` tRPC procedure in `src/server/api/routers/teams.ts`.
            2.  **COMPLETED:** In `VerificationDashboardPage`, replaced the direct Firebase queries and `useAuth` with a call to `api.teams.getForVerification.useQuery()` and `api.users.getVerificationProfile.useQuery()`.
            3.  The local state for filtering and searching will be passed as arguments to the tRPC query.
*   **Impact:**
    *   The page will be much more performant, as the data filtering and searching will be done on the server.
    *   The frontend code will be simplified.
*   **Dependencies:**
    *   The `teams.getForVerification` tRPC procedure must be implemented.

### 3.3. Verification Profile Page (`/verification/profile/page.tsx`)

*   **Analysis:** This page displays the profile of the verification volunteer.
*   **Current Implementation:** It uses the `useAuth` hook to get the user's profile information from the `AuthContext`.
*   **Migration Plan:**
    *   **Data Fetching:** The `useAuth` hook will be replaced with a tRPC query.
        *   **tRPC Router:** The `users.getVerificationProfile` procedure will be used.
        *   **Database Tables:** The `users` table will be used.
        *   **Implementation:**
            1.  **COMPLETED:** In `VerificationProfilePage`, replaced the `useAuth` hook with a call to `api.users.getVerificationProfile.useQuery()`.
*   **Impact:**
    *   The page will be decoupled from the Firebase-based `AuthContext`.
*   **Dependencies:**
    *   The `users.getVerificationProfile` tRPC procedure must be implemented.

### 3.4. Verification Teams Page (`/verification/teams/page.tsx`)

*   **Analysis:** This page is similar to the verification dashboard but may have a different layout or filtering options.
*   **Current Implementation:** It directly uses the Firebase SDK to query the `teams` collection.
*   **Migration Plan:**
    *   **Data Fetching:** The data fetching logic will be moved to a tRPC procedure.
        *   **tRPC Router:** The `teams.getForVerification` procedure will be used.
        *   **Database Tables:** The `teams` and `users` tables will be used.
        *   **Implementation:**
            1.  In `VerificationTeamsPage`, replace the direct Firebase queries with a call to `api.teams.getForVerification.useQuery()`.
*   **Impact:**
    *   The page will be more performant and the code will be cleaner.
*   **Dependencies:**
    *   The `teams.getForVerification` tRPC procedure must be implemented.

### 3.5. Team Verification Page (`/verification/teams/[teamId]/page.tsx`)

*   **Analysis:** This is the most critical page in the verification section, where the actual verification of a team and its players takes place.
*   **Current Implementation:** It heavily relies on direct Firebase SDK calls for both reading and writing data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:** All Firebase calls will be replaced with tRPC queries and mutations.
        *   **tRPC Router:**
            *   `teams.getForVerificationById`: To fetch the detailed information for a single team.
            *   `teams.verifyPlayer`: To verify a single player.
            *   `teams.bulkVerifyPlayers`: To bulk verify multiple players.
            *   `teams.updateTeamStatus`: To update the overall status of the team.
        *   **Database Tables:** `teams`, `team_players`, `users`, `audit_logs`.
        *   **Implementation:**
            1.  Implement the new tRPC procedures and mutations in `src/server/api/routers/teams.ts`.
            2.  In `TeamVerificationPage`, replace all Firebase calls with the corresponding tRPC queries and mutations.
            3.  The `auditLogService` will be replaced with calls to the tRPC mutations, which will handle auditing internally.
*   **Impact:**
    *   This page will be fully migrated to the new stack, resulting in a more secure, reliable, and auditable verification process.
*   **Dependencies:**
    *   The new tRPC procedures and mutations in the `teams` router must be implemented.

## 4. Volunteer Pages (`/src/app/[lang]/volunteer`)

The volunteer pages are used by general, technical, and verification volunteers to manage their assigned venues and tasks.

### 4.1. Volunteer Layout (`/volunteer/layout.tsx`)

*   **Analysis:** This layout component wraps all the volunteer pages and handles authentication and authorization.
*   **Current Implementation:** It uses `useAuth` and `useRedirect` hooks.
*   **Migration Plan:**
    *   **Authentication and Authorization:**
        *   **tRPC Router:** A new tRPC procedure, `users.getVolunteerProfile`, will be created to fetch the user's profile and roles and to verify that they have a volunteer role.
        *   **Database Tables:** `users`.
        *   **Implementation:**
            1.  Create the `users.getVolunteerProfile` tRPC procedure.
            2.  In `VolunteerLayout`, replace `useAuth` and `useRedirect` with a call to `api.users.getVolunteerProfile.useQuery()`.
*   **Impact:** Centralized and more secure authentication and authorization.
*   **Dependencies:** `users.getVolunteerProfile` tRPC procedure.

### 4.2. Volunteer Dashboard (`/volunteer/dashboard/page.tsx`)

*   **Analysis:** This page displays a list of venues assigned to the volunteer.
*   **Current Implementation:** It uses a server action `getVolunteerAssignments` to fetch data.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC procedure, `volunteers.getAssignments`, will be created to fetch the volunteer's assignments.
        *   **Database Tables:** `volunteer_assignments`, `venues`, `sports`.
        *   **Implementation:**
            1.  Create the `volunteers.getAssignments` tRPC procedure.
            2.  In `VolunteerDashboard`, replace the call to `getVolunteerAssignments` with `api.volunteers.getAssignments.useQuery()`.
*   **Impact:** More consistent data fetching mechanism.
*   **Dependencies:** `volunteers.getAssignments` tRPC procedure.

### 4.3. Volunteer Profile Page (`/volunteer/profile/page.tsx`)

*   **Analysis:** This page displays the profile of the volunteer.
*   **Current Implementation:** It uses the `useAuth` hook.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** The `users.getVolunteerProfile` procedure will be used.
        *   **Database Tables:** `users`.
        *   **Implementation:**
            1.  In `VolunteerProfilePage`, replace `useAuth` with `api.users.getVolunteerProfile.useQuery()`.
*   **Impact:** Decoupled from Firebase.
*   **Dependencies:** `users.getVolunteerProfile` tRPC procedure.

### 4.4. Volunteer Reports Page (`/volunteer/reports/page.tsx`)

*   **Analysis:** This page is currently a placeholder.
*   **Migration Plan:** This page needs to be implemented from scratch. The requirements for this page need to be defined.
*   **Impact:** New functionality.
*   **Dependencies:** None.

### 4.5. Venue Layout (`/volunteer/venues/layout.tsx`)

*   **Analysis:** A simple layout component.
*   **Migration Plan:** No migration needed.
*   **Impact:** None.
*   **Dependencies:** None.

### 4.6. Venue Dashboard (`/volunteer/venues/[venueId]/page.tsx`)

*   **Analysis:** This page provides an overview of a specific venue.
*   **Current Implementation:** It uses multiple server actions to fetch data.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC procedure, `venues.getDashboard`, will be created to fetch all the data for the venue dashboard in a single call.
        *   **Database Tables:** `venues`, `teams`, `fixtures`, `matches`.
        *   **Implementation:**
            1.  Create the `venues.getDashboard` tRPC procedure.
            2.  In `TechnicalVolunteerVenueDashboard`, replace the multiple server action calls with a single call to `api.venues.getDashboard.useQuery()`.
*   **Impact:** Improved performance and simplified code.
*   **Dependencies:** `venues.getDashboard` tRPC procedure.

### 4.7. Venue Fixtures Page (`/volunteer/venues/[venueId]/fixtures/page.tsx`)

*   **Analysis:** This page displays a list of fixtures (tournaments) for a specific venue and allows volunteers to create new fixtures.
*   **Current Implementation:** It uses server actions `getVenueCheckedInTeams` and `getVenueFixtures` to fetch data.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:**
            *   `fixtures.getForVenue`: To fetch all fixtures for a given venue.
            *   `teams.getCheckedInForVenue`: To fetch checked-in teams for a given venue.
            *   `fixtures.createDraw`: To handle the creation of new tournament draws.
        *   **Database Tables:** `fixtures`, `teams`, `sports`.
        *   **Implementation:**
            1.  Implement the new tRPC procedures and mutations in `src/server/api/routers/fixtures.ts` and `src/server/api/routers/teams.ts`.
            2.  In `FixturesPage`, replace the calls to server actions with calls to `api.fixtures.getForVenue.useQuery()` and `api.teams.getCheckedInForVenue.useQuery()`.
            3.  The "Create Draw" button will trigger `api.fixtures.createDraw.useMutation()`.
*   **Impact:** Consistent data fetching and mutation patterns.
*   **Dependencies:** New tRPC procedures and mutations.

### 4.8. Venue Matches Page (`/volunteer/venues/[venueId]/matches/page.tsx`)

*   **Analysis:** This page displays a list of matches for a specific venue, with optional filtering by fixture.
*   **Current Implementation:** It uses server actions `getVenueMatches` and `getFixtureInfo` that directly interact with Firebase Admin SDK.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:**
            *   `matches.getForVenue`: To fetch matches for a given venue, with optional filtering by fixture.
            *   `fixtures.getById`: To fetch fixture information.
        *   **Database Tables:** `matches`, `fixtures`, `teams`.
        *   **Implementation:**
            1.  Implement the new tRPC procedures in `src/server/api/routers/matches.ts` and `src/server/api/routers/fixtures.ts`.
            2.  In `MatchesPage`, replace the calls to server actions with calls to `api.matches.getForVenue.useQuery()` and `api.fixtures.getById.useQuery()`.
*   **Impact:** Decoupled from Firebase Admin SDK.
*   **Dependencies:** New tRPC procedures.

### 4.9. Venue Media Page (`/volunteer/venues/[venueId]/media/page.tsx`)

*   **Analysis:** This page allows volunteers to upload and manage media for a specific venue.
*   **Current Implementation:** It uses a `useMediaManager` hook that likely interacts with Firebase Storage and Firestore. It also has placeholder data for fixtures and matches.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:**
            *   `media.getForVenue`: To fetch media items for a given venue.
            *   `media.upload`: To handle media uploads.
            *   `media.update`: To update media item metadata.
            *   `media.delete`: To delete media items.
            *   `fixtures.getForVenue` and `matches.getForVenue`: To replace placeholder data for available fixtures and matches.
        *   **Database Tables:** `media`, `fixtures`, `matches`.
        *   **Implementation:**
            1.  Implement the new tRPC procedures and mutations in `src/server/api/routers/media.ts`, `src/server/api/routers/fixtures.ts`, and `src/server/api/routers/matches.ts`.
            2.  Refactor the `useMediaManager` hook to use the new tRPC procedures and mutations.
            3.  Replace placeholder data with actual tRPC queries.
*   **Impact:** Full migration of media management to the new stack.
*   **Dependencies:** New tRPC procedures and mutations, and a new file storage solution (e.g., Supabase Storage).

### 4.10. Venue Teams Page (`/volunteer/venues/[venueId]/teams/page.tsx`)

*   **Analysis:** This page displays a list of teams for a specific venue, focusing on match day verification.
*   **Current Implementation:** It uses a server action `getVenueTeamsForMatchDay` to fetch data.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** `teams.getForMatchDayVerification`: To fetch teams for match day verification for a given venue.
        *   **Database Tables:** `teams`, `team_players`.
        *   **Implementation:**
            1.  Implement the new tRPC procedure in `src/server/api/routers/teams.ts`.
            2.  In `MatchDayTeamsPage`, replace the call to `getVenueTeamsForMatchDay` with `api.teams.getForMatchDayVerification.useQuery()`.
*   **Impact:** Consistent data fetching mechanism.
*   **Dependencies:** New tRPC procedure.

## 5. Admin Pages (`/src/app/[lang]/admin`)

The admin pages provide comprehensive control over the entire tournament management system. This section will involve extensive migration, as many functionalities are likely tied to Firebase.

### 5.1. Admin Layout (`/admin/layout.tsx`)

*   **Analysis:** This layout component wraps all the admin pages and handles authentication and authorization.
*   **Current Implementation:** It uses `useAuth` and `useRedirect` hooks.
*   **Migration Plan:**
    *   **Authentication and Authorization:**
        *   **tRPC Router:** A new tRPC procedure, `users.getAdminProfile`, will be created to fetch the user's profile and roles and to verify that they have the `admin` role.
        *   **Database Tables:** `users`.
        *   **Implementation:**
            1.  Create the `users.getAdminProfile` tRPC procedure.
            2.  In `AdminLayout`, replace `useAuth` and `useRedirect` with a call to `api.users.getAdminProfile.useQuery()`.
*   **Impact:** Centralized and more secure authentication and authorization for the admin panel.
*   **Dependencies:** `users.getAdminProfile` tRPC procedure.

### 5.2. Admin Analytics Pages (`/admin/analytics/page.tsx`, `/admin/analytics/metrics/page.tsx`, `/admin/analytics/reports/page.tsx`)

*   **Analysis:** These pages are intended for displaying various analytics and reports related to the tournament.
*   **Current Implementation:** It's highly probable these pages either fetch data directly from Firebase (e.g., Firestore collections for user activity, team registrations, etc.) or are placeholders.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC router, `analytics`, will be created. It will contain procedures to fetch aggregated data for various metrics and reports.
            *   `analytics.getDashboardMetrics`: For high-level statistics (total users, teams, events, etc.).
            *   `analytics.getRegistrationTrends`: For registration trends over time.
            *   `analytics.getTeamDistribution`: For geographical distribution of teams.
            *   `analytics.getSportParticipation`: For participation statistics per sport.
        *   **Database Tables:** `users`, `teams`, `events`, `fixtures`, `matches`, `audit_logs`.
        *   **Implementation:**
            1.  Implement the `analytics` tRPC router and its procedures.
            2.  In the respective analytics pages, replace direct Firebase data fetching with calls to the new tRPC procedures.
*   **Impact:** Real-time, accurate analytics based on PostgreSQL data.
*   **Dependencies:** New `analytics` tRPC router and procedures.

### 5.3. Admin Audit Logs Page (`/admin/audit-logs/page.tsx`)

*   **Analysis:** This page displays a log of all significant actions performed within the system.
*   **Current Implementation:** It likely fetches data directly from a Firebase Firestore collection dedicated to audit logs.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC procedure, `auditLogs.getAll`, will be created to fetch all audit log entries, with support for filtering and pagination.
        *   **Database Tables:** `audit_logs`.
        *   **Implementation:**
            1.  Implement the `auditLogs.getAll` tRPC procedure.
            2.  In `AuditLogsPage`, replace direct Firebase data fetching with a call to `api.auditLogs.getAll.useQuery()`.
*   **Impact:** Centralized and auditable log management within PostgreSQL.
*   **Dependencies:** New `auditLogs` tRPC router and procedures.

### 5.4. Admin Dashboard Page (`/admin/dashboard/page.tsx`)

*   **Analysis:** This is the main overview page for administrators, displaying key statistics and recent activities.
*   **Current Implementation:** It likely fetches data from various Firebase collections to populate its widgets.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC procedure, `admin.getDashboardData`, will be created to fetch all necessary data for the dashboard in a single call.
        *   **Database Tables:** `users`, `teams`, `events`, `fixtures`, `matches`, `audit_logs`.
        *   **Implementation:**
            1.  Implement the `admin.getDashboardData` tRPC procedure.
            2.  In `AdminDashboardPage`, replace multiple Firebase data fetches with a single call to `api.admin.getDashboardData.useQuery()`.
*   **Impact:** Improved performance and simplified data fetching for the dashboard.
*   **Dependencies:** New `admin` tRPC router and procedures.

### 5.5. Admin Data Management Page (`/admin/data-management/page.tsx`)

*   **Analysis:** This page likely provides tools for administrators to manage raw data, perform imports/exports, or run data cleanup tasks.
*   **Current Implementation:** This page might involve direct Firebase Admin SDK operations or serverless functions.
*   **Migration Plan:**
    *   **Data Operations:**
        *   **tRPC Router:** A new tRPC router, `dataManagement`, will be created with procedures for various data management tasks.
            *   `dataManagement.importData`: For importing data (e.g., from CSV files).
            *   `dataManagement.exportData`: For exporting data (e.g., to CSV files).
            *   `dataManagement.cleanupData`: For running data cleanup scripts.
        *   **Database Tables:** All relevant tables (`users`, `teams`, `events`, etc.).
        *   **Implementation:**
            1.  Implement the `dataManagement` tRPC router and its procedures.
            2.  The frontend will call these tRPC procedures to trigger data management operations.
*   **Impact:** Centralized and secure data management operations.
*   **Dependencies:** New `dataManagement` tRPC router and procedures.

### 5.6. Admin Events Pages (`/admin/events/page.tsx`, `/admin/events/create/page.tsx`, `/admin/events/[eventId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage tournament events (create, view, edit).
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for event data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `events` router will be extended with admin-specific procedures.
            *   `events.getAllAdmin`: To fetch all events for admin view.
            *   `events.create`: To create a new event.
            *   `events.getByIdAdmin`: To fetch details of a specific event for editing.
            *   `events.update`: To update an existing event.
            *   `events.delete`: To delete an event.
        *   **Database Tables:** `events`.
        *   **Implementation:**
            1.  Extend the `events` tRPC router with the new procedures.
            2.  In the respective event pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of event management to the new stack.
*   **Dependencies:** Extended `events` tRPC router.

### 5.7. Admin Fixtures Pages (`/admin/fixtures/page.tsx`, `/admin/fixtures/create/page.tsx`, `/admin/fixtures/[fixtureId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage tournament fixtures (create, view, edit).
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for fixture data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `fixtures` router will be extended with admin-specific procedures.
            *   `fixtures.getAllAdmin`: To fetch all fixtures for admin view.
            *   `fixtures.create`: To create a new fixture.
            *   `fixtures.getByIdAdmin`: To fetch details of a specific fixture for editing.
            *   `fixtures.update`: To update an existing fixture.
            *   `fixtures.delete`: To delete a fixture.
        *   **Database Tables:** `fixtures`, `sports`, `venues`.
        *   **Implementation:**
            1.  Extend the `fixtures` tRPC router with the new procedures.
            2.  In the respective fixture pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of fixture management to the new stack.
*   **Dependencies:** Extended `fixtures` tRPC router.

### 5.8. Admin Matches Pages (`/admin/matches/page.tsx`, `/admin/matches/schedule/page.tsx`, `/admin/matches/[matchId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage tournament matches (schedule, view, edit results).
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for match data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** A new tRPC router, `matches`, will be created or extended with admin-specific procedures.
            *   `matches.getAllAdmin`: To fetch all matches for admin view.
            *   `matches.schedule`: To schedule new matches.
            *   `matches.getByIdAdmin`: To fetch details of a specific match for editing.
            *   `matches.updateResult`: To update match results.
            *   `matches.delete`: To delete a match.
        *   **Database Tables:** `matches`, `teams`, `fixtures`, `venues`.
        *   **Implementation:**
            1.  Implement the `matches` tRPC router and its procedures.
            2.  In the respective match pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of match management to the new stack.
*   **Dependencies:** New `matches` tRPC router.

### 5.9. Admin Media Pages (`/admin/media/page.tsx`, `/admin/media/moderation/page.tsx`, `/admin/media/[mediaId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage and moderate media (photos and videos).
*   **Current Implementation:** These pages likely interact directly with Firebase Storage and Firestore for media data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `media` router will be extended with admin-specific procedures.
            *   `media.getAllAdmin`: To fetch all media items for admin view.
            *   `media.moderate`: To approve or reject media items.
            *   `media.getByIdAdmin`: To fetch details of a specific media item.
            *   `media.delete`: To delete a media item.
        *   **Database Tables:** `media`.
        *   **Implementation:**
            1.  Extend the `media` tRPC router with the new procedures.
            2.  In the respective media pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of media management and moderation to the new stack.
*   **Dependencies:** Extended `media` tRPC router, and a new file storage solution.

### 5.10. Admin Notifications Pages (`/admin/notifications/page.tsx`, `/admin/notifications/create/page.tsx`, `/admin/notifications/templates/page.tsx`, `/admin/notifications/[notificationId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage and send notifications.
*   **Current Implementation:** These pages likely interact directly with Firebase for notification data and sending.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** A new tRPC router, `notifications`, will be created with procedures for notification management.
            *   `notifications.getAllAdmin`: To fetch all notifications for admin view.
            *   `notifications.create`: To create and send a new notification.
            *   `notifications.getTemplates`: To fetch notification templates.
            *   `notifications.getByIdAdmin`: To fetch details of a specific notification.
            *   `notifications.update`: To update a notification.
            *   `notifications.delete`: To delete a notification.
        *   **Database Tables:** `notifications`.
        *   **Implementation:**
            1.  Implement the `notifications` tRPC router and its procedures.
            2.  In the respective notification pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of notification management to the new stack.
*   **Dependencies:** New `notifications` tRPC router.

### 5.11. Admin Profile Page (`/admin/profile/page.tsx`)

*   **Analysis:** This page displays the profile of the administrator.
*   **Current Implementation:** It uses the `useAuth` hook to get the user's profile information.
*   **Migration Plan:**
    *   **Data Fetching:**
        *   **tRPC Router:** The `users.getAdminProfile` procedure will be used.
        *   **Database Tables:** `users`.
        *   **Implementation:**
            1.  In `AdminProfilePage`, replace `useAuth` with `api.users.getAdminProfile.useQuery()`.
*   **Impact:** Decoupled from Firebase.
*   **Dependencies:** `users.getAdminProfile` tRPC procedure.

### 5.12. Admin Sports Pages (`/admin/sports/page.tsx`, `/admin/sports/create/page.tsx`, `/admin/sports/[sportId]/page.tsx`)

*   **Analysis:** These pages allow administrators to manage sports (create, view, edit).
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for sport data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `sports` router will be extended with admin-specific procedures.
            *   `sports.getAllAdmin`: To fetch all sports for admin view.
            *   `sports.create`: To create a new sport.
            *   `sports.getByIdAdmin`: To fetch details of a specific sport for editing.
            *   `sports.update`: To update an existing sport.
            *   `sports.delete`: To delete a sport.
        *   **Database Tables:** `sports`.
        *   **Implementation:**
            1.  Extend the `sports` tRPC router with the new procedures.
            2.  In the respective sport pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of sport management to the new stack.
*   **Dependencies:** Extended `sports` tRPC router.

### 5.13. Admin System Page (`/admin/system/page.tsx`)

*   **Analysis:** This page is currently a placeholder.
*   **Migration Plan:** This page needs to be implemented from scratch. It will likely involve managing system-wide configurations.
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** A new tRPC router, `systemConfig`, will be created with procedures for managing system configurations.
            *   `systemConfig.get`: To fetch system configurations.
            *   `systemConfig.update`: To update system configurations.
        *   **Database Tables:** `system_config`.
        *   **Implementation:**
            1.  Implement the `systemConfig` tRPC router and its procedures.
            2.  Implement the frontend to display and allow editing of system configurations.
*   **Impact:** New functionality for managing system settings.
*   **Dependencies:** New `systemConfig` tRPC router.

### 5.14. Admin Teams Pages (`/admin/teams/page.tsx`, `/admin/teams/[teamId]/page.tsx`, `/admin/teams/advancement/page.tsx`, `/admin/teams/venue-assignment/page.tsx`, `/admin/teams/verification/page.tsx`)

*   **Analysis:** These pages allow administrators to manage teams, including their advancement, venue assignments, and verification status.
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for team data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `teams` router will be extended with admin-specific procedures.
            *   `teams.getAllAdmin`: To fetch all teams for admin view.
            *   `teams.getByIdAdmin`: To fetch details of a specific team for editing.
            *   `teams.update`: To update an existing team.
            *   `teams.delete`: To delete a team.
            *   `teams.assignToVenue`: To assign a team to a venue.
            *   `teams.updateAdvancement`: To update a team's advancement status.
            *   `teams.getForAdminVerification`: To fetch teams for admin-level verification.
        *   **Database Tables:** `teams`, `team_players`, `team_venue_assignments`.
        *   **Implementation:**
            1.  Extend the `teams` tRPC router with the new procedures.
            2.  In the respective team pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of team management to the new stack.
*   **Dependencies:** Extended `teams` tRPC router.

### 5.15. Admin Test Connection Page (`/admin/test-connection/page.tsx`)

*   **Analysis:** This directory is empty, suggesting it's a placeholder for testing database connections or other system health checks.
*   **Migration Plan:** This page needs to be implemented from scratch. It will involve making test calls to the PostgreSQL database and potentially other services to verify connectivity and functionality.
    *   **Data Fetching:**
        *   **tRPC Router:** A new tRPC router, `test`, will be created with a procedure to test the database connection.
            *   `test.dbConnection`: To test the database connection.
        *   **Database Tables:** None directly, but it will attempt to connect to the PostgreSQL database.
        *   **Implementation:**
            1.  Implement the `test` tRPC router and its procedure.
            2.  Implement the frontend to display the results of the connection test.
*   **Impact:** Provides a tool for verifying the health of the new backend.
*   **Dependencies:** New `test` tRPC router.

### 5.16. Admin Users Pages (`/admin/users/page.tsx`, `/admin/users/[userId]/page.tsx`, `/admin/users/verification/page.tsx`, `/admin/users/volunteers/page.tsx`)

*   **Analysis:** These pages allow administrators to manage users, including their profiles, roles, and verification status.
*   **Current Implementation:** These pages likely interact directly with Firebase Authentication and Firestore for user data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `users` router will be extended with admin-specific procedures.
            *   `users.getAllAdmin`: To fetch all users for admin view.
            *   `users.getByIdAdmin`: To fetch details of a specific user for editing.
            *   `users.update`: To update an existing user's profile or role.
            *   `users.delete`: To delete a user.
            *   `users.verifyUser`: To verify a user's profile.
            *   `users.assignRole`: To assign a role to a user.
            *   `users.getAllVolunteers`: To fetch all volunteers.
        *   **Database Tables:** `users`, `user_verifications`.
        *   **Implementation:**
            1.  Extend the `users` tRPC router with the new procedures.
            2.  In the respective user pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of user management to the new stack.
*   **Dependencies:** Extended `users` tRPC router.

### 5.17. Admin Venues Pages (`/admin/venues/page.tsx`, `/admin/venues/create/page.tsx`, `/admin/venues/[venueId]/page.tsx`, `/admin/venues/cluster-division-mapping/page.tsx`, `/admin/venues/location-mapping/page.tsx`)

*   **Analysis:** These pages allow administrators to manage venues, including their creation, editing, and mapping to clusters and divisions.
*   **Current Implementation:** These pages likely interact directly with Firebase Firestore for venue data.
*   **Migration Plan:**
    *   **Data Fetching and Mutations:**
        *   **tRPC Router:** The existing `venues` router will be extended with admin-specific procedures.
            *   `venues.getAllAdmin`: To fetch all venues for admin view.
            *   `venues.create`: To create a new venue.
            *   `venues.getByIdAdmin`: To fetch details of a specific venue for editing.
            *   `venues.update`: To update an existing venue.
            *   `venues.delete`: To delete a venue.
            *   `venues.mapClusterDivision`: To map venues to clusters and divisions.
            *   `venues.mapLocation`: To map venues to specific locations.
        *   **Database Tables:** `venues`, `cluster_division_mappings`, `venue_location_mappings`.
        *   **Implementation:**
            1.  Extend the `venues` tRPC router with the new procedures.
            2.  In the respective venue pages, replace Firebase data operations with calls to the new tRPC procedures.
*   **Impact:** Full migration of venue management to the new stack.
*   **Dependencies:** Extended `venues` tRPC router.

## 6. Summary and Next Steps

This migration plan provides a detailed roadmap for transitioning the Isha Gramotsavam application from Firebase to a PostgreSQL and tRPC backend. The plan covers the public, verification, volunteer, and admin sections of the application, outlining the necessary changes to frontend pages, tRPC routers, and database interactions.

**Key Migration Areas:**

*   **Authentication and Authorization:** Centralizing user management and role-based access control through tRPC procedures, replacing Firebase Authentication.
*   **Data Fetching and Mutations:** Replacing direct Firebase SDK calls and server actions with tRPC queries and mutations for all data operations.
*   **Database Schema:** Leveraging the existing Prisma schema for PostgreSQL to ensure data integrity and consistency.
*   **File Storage:** Migrating from Firebase Storage to a new solution (e.g., Supabase Storage) for media and document storage.
*   **Audit Logging:** Ensuring all significant actions are logged in the PostgreSQL `audit_logs` table via tRPC mutations.

**Next Steps:**

1.  **Backend Implementation (tRPC Routers):** Prioritize the implementation of the new tRPC procedures and mutations as outlined in this document. This includes creating new routers (e.g., `analytics`, `auditLogs`, `notifications`, `systemConfig`, `test`) and extending existing ones (e.g., `users`, `teams`, `events`, `fixtures`, `matches`, `media`, `venues`, `volunteers`).
2.  **Database Setup and Data Migration:** Set up the PostgreSQL database based on the `prisma/schema.prisma` and plan the migration of existing data from Firebase Firestore to PostgreSQL. This will likely involve writing one-off scripts.
3.  **Frontend Refactoring:** Once the backend tRPC procedures are available, refactor the frontend components to consume data and perform actions through the new tRPC API. This will involve replacing `useAuth` and direct Firebase calls with tRPC hooks.
4.  **Testing:** Implement comprehensive unit, integration, and end-to-end tests to ensure the correctness and stability of the migrated application.
5.  **Performance Optimization:** Monitor and optimize the performance of the new tRPC endpoints and database queries.
6.  **Deployment:** Plan and execute the deployment of the new backend and frontend infrastructure.

This plan serves as a living document and may be updated as the migration progresses and new insights are gained.