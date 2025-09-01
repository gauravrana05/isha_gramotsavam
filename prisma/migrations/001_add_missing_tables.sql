-- Add missing tables for security fixes

-- Volunteer assignments table (if not exists)
CREATE TABLE IF NOT EXISTS "volunteer_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_assignments_pkey" PRIMARY KEY ("id")
);

-- Team join requests table (if not exists)
CREATE TABLE IF NOT EXISTS "team_join_requests" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "responded_by" TEXT,

    CONSTRAINT "team_join_requests_pkey" PRIMARY KEY ("id")
);

-- Audit log table for admin actions
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "volunteer_assignments_user_id_idx" ON "volunteer_assignments"("user_id");
CREATE INDEX IF NOT EXISTS "volunteer_assignments_venue_id_idx" ON "volunteer_assignments"("venue_id");
CREATE INDEX IF NOT EXISTS "volunteer_assignments_status_idx" ON "volunteer_assignments"("status");

CREATE INDEX IF NOT EXISTS "team_join_requests_team_id_idx" ON "team_join_requests"("team_id");
CREATE INDEX IF NOT EXISTS "team_join_requests_player_id_idx" ON "team_join_requests"("player_id");
CREATE INDEX IF NOT EXISTS "team_join_requests_status_idx" ON "team_join_requests"("status");

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- Add foreign key constraints
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "volunteer_assignments_user_venue_unique" ON "volunteer_assignments"("user_id", "venue_id") WHERE "status" = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS "team_join_requests_team_player_unique" ON "team_join_requests"("team_id", "player_id") WHERE "status" = 'pending';
