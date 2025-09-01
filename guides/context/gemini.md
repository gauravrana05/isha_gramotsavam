# GEMINI.md

## Project Goal

The primary goal of this project is to migrate the Isha Gramotsavam tournament management application from a Firebase-based backend to a more robust and scalable stack using PostgreSQL as the database and tRPC for building a typesafe API. This migration aims to improve data integrity, performance, and maintainability of the application.

## Project Overview

This is a [Next.js](https://nextjs.org/) project for a sports tournament management application called "Isha Gramotsavam". It is currently in the process of migrating from Firebase to a new stack that includes:

*   **[TypeScript](https://www.typescriptlang.org/):** For static typing and improved code quality.
*   **[Prisma](https://www.prisma.io/):** As the ORM for a PostgreSQL database.
*   **[tRPC](https://trpc.io/):** For building typesafe APIs.
*   **[Tailwind CSS](https://tailwindcss.com/):** For styling.
*   **[Firebase](https://firebase.google.com/) & [Supabase](https://supabase.com/):** For services like storage and potentially for authentication during the transition.

The application is a feature-rich platform for managing all aspects of a sports tournament, as detailed in the `USER_JOURNEYS.md` file. It supports various user roles, including Admins, Captains, Players, and Volunteers, each with specific responsibilities and workflows.

The application is also a Progressive Web App (PWA), as indicated by the `next-pwa` configuration in `next.config.ts`.

## Building and Running

### Development

To run the development server, use the following command:

```bash
npm run dev
```

This will start the Next.js development server with Turbopack.

### Building

To create a production build, use the following command:

```bash
npm run build
```

This will generate the production-ready application in the `.next` directory.

### Database

The project uses Prisma for database management. Here are some key commands:

*   `npm run db:generate`: Generate the Prisma Client based on the schema.
*   `npm run db:push`: Push the schema changes to the database.
*   `npm run db:migrate`: Create and apply a new migration.
*   `npm run db:seed`: Seed the database with initial data.
*   `npm run db:studio`: Open the Prisma Studio to view and edit data in the database.

## Development Conventions

### API

The project is migrating to tRPC for its API. The main router is defined in `src/server/api/root.ts`, which combines several sub-routers for different parts of the application (users, profile, teams, etc.). When adding new API endpoints, you should create a new router in `src/server/api/routers` and add it to the `appRouter` in `src/server/api/root.ts`.

The migration will involve moving business logic from existing Firebase Cloud Functions or client-side code to tRPC resolvers.

### Database

The database schema is defined in `prisma/schema.prisma`. This is the source of truth for the PostgreSQL database. When making changes to the database, you should update this file and then run the appropriate Prisma command to apply the changes.

### Styling

The project uses Tailwind CSS for styling. Utility classes should be used whenever possible to maintain a consistent design system.

### Authentication and Authorization

User authentication is currently handled by Firebase Auth, but this may be migrated to a different solution as part of the project. Authorization is based on user roles defined in the Prisma schema. The migration will involve re-implementing the authorization logic to work with the new tRPC API and PostgreSQL database.

### User Journeys

The `USER_JOURNEYS.md` file provides a detailed breakdown of the application's functionality and user roles. This document should be consulted when implementing new features or modifying existing workflows to ensure that the user experience remains consistent and intuitive.