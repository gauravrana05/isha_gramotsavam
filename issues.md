# Migration Issues Log

## src/server/api/routers/admin.ts

### Issue 1: `registration_deadline` in `getEvents` query
*   **File:** `src/server/api/routers/admin.ts`
*   **Line/Snippet:**
    ```typescript
    // registrationDeadline: event.registration_deadline?.toISOString() || null, // TODO: Clarify mapping for registration_deadline
    ```
*   **Note:** The `Event` model in `schema.prisma` no longer has `registration_deadline`. It has `registrationStartDate` and `registrationEndDate`. This field needs to be replaced with the appropriate new field(s) or removed if no longer relevant. Manual review is required to determine the correct mapping.

### Issue 2: `is_verified` in `verifyUser` mutation
*   **File:** `src/server/api/routers/admin.ts`
*   **Line/Snippet:**
    ```typescript
    data: { /* is_verified: input.isVerified */ } // TODO: Clarify mapping for is_verified
    // isVerified: user.is_verified, // TODO: Clarify mapping for is_verified
    ```
*   **Note:** The `User` model in `schema.prisma` no longer has a direct `is_verified` field. User verification is now handled through the `UserVerification` model and the `profileComplete` field on the `User` model. Manual review is required to determine how to implement user verification using the new schema. It might involve creating or updating `UserVerification` entries or setting `profileComplete`.

## src/server/api/routers/sports.ts

### Issue 1: Raw SQL Query in `getForGender` procedure
*   **File:** `src/server/api/routers/sports.ts`
*   **Line/Snippet:**
    ```typescript
    const sportsQuery = `
      SELECT DISTINCT s.id, s.name, s.description, s.main_players_count, s.max_substitutes
      FROM sports s
      JOIN sport_gender_categories sgc ON s.id = sgc.sport_id
      WHERE s.is_active = true 
      AND (
        sgc.genderCategory = 'mixed' OR
        (sgc.genderCategory = 'men' AND $1 = 'M') OR
        (sgc.genderCategory = 'women' AND $1 = 'F')
      )
      ORDER BY s.name
    `
    const sports = await db.$queryRawUnsafe(sportsQuery, input.gender)
    ```
*   **Note:** This procedure uses a raw SQL query (`db.$queryRawUnsafe`) which bypasses Prisma's ORM and its naming conventions. The query still uses snake_case table and column names (`sports`, `sport_gender_categories`, `is_active`, `sport_id`, `main_players_count`, `max_substitutes`). This cannot be automatically refactored by the agent. Manual review and refactoring to use Prisma's query builder (e.g., `db.sport.findMany`) is recommended to ensure type safety and consistency with the new schema.