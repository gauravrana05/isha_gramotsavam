-- CreateEnum
CREATE TYPE "public"."LocationType" AS ENUM ('district', 'taluk');

-- CreateEnum
CREATE TYPE "public"."AssignmentMethod" AS ENUM ('auto_assigned', 'manual_assigned');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('assigned', 'confirmed', 'active', 'completed');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."FixtureStatus" AS ENUM ('draft', 'teams_assigned', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "public"."GenderCategory" AS ENUM ('men', 'women', 'mixed');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('scheduled', 'ready', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."MediaEntity" AS ENUM ('match', 'event', 'venue', 'fixture', 'post');

-- CreateEnum
CREATE TYPE "public"."MediaStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('info', 'success', 'warning', 'error', 'team_invitation', 'verification_update', 'match_result', 'venue_assignment', 'system_announcement', 'match_reminder', 'tournament_update');

-- CreateEnum
CREATE TYPE "public"."PlayerPosition" AS ENUM ('main', 'substitute');

-- CreateEnum
CREATE TYPE "public"."TeamStatus" AS ENUM ('draft', 'submitted', 'verified', 'rejected', 'checked_in');

-- CreateEnum
CREATE TYPE "public"."TournamentLevel" AS ENUM ('cluster', 'division', 'final');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer', 'public');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('pending', 'verified', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."VerificationType" AS ENUM ('document_verification', 'onground_verification');

-- CreateEnum
CREATE TYPE "public"."VolunteerType" AS ENUM ('general_volunteer', 'technical_volunteer');

-- CreateEnum
CREATE TYPE "public"."PostEntity" AS ENUM ('fixture', 'match');

-- CreateEnum
CREATE TYPE "public"."PostVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "public"."NotificationDeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('general', 'match', 'team', 'verification', 'system', 'emergency');

-- CreateEnum
CREATE TYPE "public"."NotificationBroadcastStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "comments" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cluster_division_mappings" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "cluster_venue_mapping_id" UUID NOT NULL,
    "division_venue_mapping_id" UUID NOT NULL,
    "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "cluster_division_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "registration_start_date" DATE NOT NULL,
    "registration_end_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fixture_results" (
    "id" UUID NOT NULL,
    "fixture_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "finalPosition" INTEGER NOT NULL,
    "qualifies_for_next" BOOLEAN NOT NULL DEFAULT false,
    "recorded_by" UUID,
    "recorded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fixture_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fixture_teams" (
    "fixture_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMPTZ(6),
    "checked_in_by" UUID,
    "final_position" INTEGER,
    "qualifies_for_next" BOOLEAN NOT NULL DEFAULT false,
    "tournament_points" INTEGER,
    "result_recorded_at" TIMESTAMPTZ(6),
    "result_recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fixture_teams_pkey" PRIMARY KEY ("fixture_id","team_id")
);

-- CreateTable
CREATE TABLE "public"."fixtures" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_id" UUID,
    "sport_id" UUID NOT NULL,
    "venue_level_mapping_id" UUID NOT NULL,
    "gender_category" "public"."GenderCategory" NOT NULL,
    "level" "public"."TournamentLevel" NOT NULL,
    "status" "public"."FixtureStatus" NOT NULL DEFAULT 'draft',
    "champion_team_id" UUID,
    "champion_team_name" VARCHAR(200),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matches" (
    "id" UUID NOT NULL,
    "fixture_id" UUID NOT NULL,
    "event_id" UUID,
    "sport_id" UUID NOT NULL,
    "venue_level_mapping_id" UUID NOT NULL,
    "gender_category" "public"."GenderCategory" NOT NULL,
    "round_name" VARCHAR(100) NOT NULL,
    "match_number" INTEGER NOT NULL,
    "team1_id" UUID,
    "team2_id" UUID,
    "depends_on_match1_id" UUID,
    "depends_on_match2_id" UUID,
    "next_match_id" UUID,
    "next_slot" VARCHAR(10),
    "winner_id" UUID,
    "winner_name" VARCHAR(200),
    "team1_score" INTEGER,
    "team2_score" INTEGER,
    "score_details" TEXT,
    "result_entered_by" UUID,
    "result_entered_at" TIMESTAMPTZ(6),
    "scheduled_time" TIMESTAMPTZ(6),
    "actual_start_time" TIMESTAMPTZ(6),
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media" (
    "id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "fileSize" BIGINT,
    "entity_type" "public"."MediaEntity" NOT NULL,
    "entity_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "status" "public"."MediaStatus" NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "post_id" UUID,
    "caption" VARCHAR(500),
    "order_in_post" INTEGER,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "action_url" VARCHAR(500),
    "created_by" UUID,
    "template_id" UUID,
    "broadcast_id" UUID,
    "scheduled_for" TIMESTAMPTZ(6),
    "delivery_status" "public"."NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "delivered_at" TIMESTAMPTZ(6),
    "push_sent" BOOLEAN NOT NULL DEFAULT false,
    "push_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL DEFAULT 'general',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_broadcasts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "targetRoles" JSONB NOT NULL DEFAULT '[]',
    "targetVenueIds" JSONB NOT NULL DEFAULT '[]',
    "scheduled_for" TIMESTAMPTZ(6),
    "status" "public"."NotificationBroadcastStatus" NOT NULL DEFAULT 'draft',
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "match_updates" BOOLEAN NOT NULL DEFAULT true,
    "team_updates" BOOLEAN NOT NULL DEFAULT true,
    "verification_updates" BOOLEAN NOT NULL DEFAULT true,
    "system_announcements" BOOLEAN NOT NULL DEFAULT true,
    "push_subscription" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sport_gender_categories" (
    "sport_id" UUID NOT NULL,
    "gender_category" "public"."GenderCategory" NOT NULL,

    CONSTRAINT "sport_gender_categories_pkey" PRIMARY KEY ("sport_id","gender_category")
);

-- CreateTable
CREATE TABLE "public"."sports" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "main_players_count" INTEGER NOT NULL,
    "max_substitutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_config" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."location_cluster_mappings" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "location_type" "public"."LocationType" NOT NULL,
    "location_name" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "cluster_venue_mapping_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "location_cluster_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_photos" (
    "team_id" UUID NOT NULL,
    "photo_path" VARCHAR(500) NOT NULL,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "team_photos_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "public"."team_players" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" "public"."PlayerPosition" NOT NULL,
    "verification_status" "public"."VerificationStatus" NOT NULL DEFAULT 'pending',
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "whatsapp_number" VARCHAR(20),
    "date_of_birth" DATE NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "panchayat" VARCHAR(100) NOT NULL,
    "taluk" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "team_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_venue_assignments" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "level" "public"."TournamentLevel" NOT NULL DEFAULT 'cluster',
    "cluster_venue_mapping_id" UUID NOT NULL,
    "division_venue_mapping_id" UUID,
    "final_venue_mapping_id" UUID,
    "cluster_qualified" BOOLEAN NOT NULL DEFAULT false,
    "division_qualified" BOOLEAN NOT NULL DEFAULT false,
    "final_qualified" BOOLEAN NOT NULL DEFAULT false,
    "assignment_method" "public"."AssignmentMethod" NOT NULL DEFAULT 'auto_assigned',
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "team_venue_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "event_id" UUID,
    "sport_id" UUID NOT NULL,
    "captain_id" UUID NOT NULL,
    "captain_name" VARCHAR(200) NOT NULL,
    "gender_category" "public"."GenderCategory" NOT NULL,
    "status" "public"."TeamStatus" NOT NULL DEFAULT 'draft',
    "panchayat" VARCHAR(100) NOT NULL,
    "taluk" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10),
    "current_players" INTEGER NOT NULL DEFAULT 0,
    "current_substitutes" INTEGER NOT NULL DEFAULT 0,
    "tournament_number" INTEGER,
    "tournament_number_assigned_at" TIMESTAMPTZ(6),
    "tournament_number_venue_mapping_id" UUID,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT,
    "author_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "entity_type" "public"."PostEntity" NOT NULL DEFAULT 'fixture',
    "entity_id" UUID NOT NULL,
    "visibility" "public"."PostVisibility" NOT NULL DEFAULT 'public',
    "status" "public"."PostStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profile_images" (
    "user_id" UUID NOT NULL,
    "profile_photo_path" VARCHAR(500),
    "aadhaar_front_path" VARCHAR(500),
    "aadhaar_back_path" VARCHAR(500),
    "all_images_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_profile_images_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "role" "public"."UserRole" NOT NULL DEFAULT 'public',
    "language_preference" VARCHAR(10) DEFAULT 'en',
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "full_name" VARCHAR(200),
    "date_of_birth" DATE,
    "age" INTEGER,
    "gender" "public"."Gender",
    "whatsapp_number" VARCHAR(20),
    "instagram_handle" VARCHAR(100),
    "panchayat" VARCHAR(100),
    "taluk" VARCHAR(100),
    "district" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "verification_type" "public"."VerificationType" NOT NULL,
    "verification_status" "public"."VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."venue_level_mappings" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "level" "public"."TournamentLevel" NOT NULL,
    "max_teams" INTEGER DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "venue_level_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500),
    "panchayat" VARCHAR(100),
    "taluk" VARCHAR(100),
    "district" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."volunteer_assignments" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "venue_level_mapping_id" UUID NOT NULL,
    "volunteer_type" "public"."VolunteerType" NOT NULL,
    "contact_phone" VARCHAR(20),
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'assigned',
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "volunteer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" UUID,
    "role" "public"."UserRole" NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "venue_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" VARCHAR(50) NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_participants" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cluster_division_mappings_event_id_cluster_venue_mapping_id_idx" ON "public"."cluster_division_mappings"("event_id", "cluster_venue_mapping_id", "division_venue_mapping_id");

-- CreateIndex
CREATE UNIQUE INDEX "cluster_division_mappings_event_id_cluster_venue_mapping_id_key" ON "public"."cluster_division_mappings"("event_id", "cluster_venue_mapping_id");

-- CreateIndex
CREATE INDEX "fixture_results_fixture_id_idx" ON "public"."fixture_results"("fixture_id");

-- CreateIndex
CREATE INDEX "fixture_results_team_id_idx" ON "public"."fixture_results"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixture_results_fixture_id_position_key" ON "public"."fixture_results"("fixture_id", "finalPosition");

-- CreateIndex
CREATE UNIQUE INDEX "fixture_results_fixture_id_team_id_key" ON "public"."fixture_results"("fixture_id", "team_id");

-- CreateIndex
CREATE INDEX "fixture_teams_fixture_id_idx" ON "public"."fixture_teams"("fixture_id");

-- CreateIndex
CREATE INDEX "fixture_teams_team_id_idx" ON "public"."fixture_teams"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixture_teams_fixture_id_final_position_key" ON "public"."fixture_teams"("fixture_id", "final_position");

-- CreateIndex
CREATE INDEX "fixtures_event_id_sport_id_venue_level_mapping_id_gender_ca_idx" ON "public"."fixtures"("event_id", "sport_id", "venue_level_mapping_id", "gender_category", "level");

-- CreateIndex
CREATE INDEX "matches_fixture_id_idx" ON "public"."matches"("fixture_id");

-- CreateIndex
CREATE INDEX "matches_event_id_idx" ON "public"."matches"("event_id");

-- CreateIndex
CREATE INDEX "matches_sport_id_idx" ON "public"."matches"("sport_id");

-- CreateIndex
CREATE INDEX "matches_venue_level_mapping_id_idx" ON "public"."matches"("venue_level_mapping_id");

-- CreateIndex
CREATE INDEX "matches_team1_id_idx" ON "public"."matches"("team1_id");

-- CreateIndex
CREATE INDEX "matches_team2_id_idx" ON "public"."matches"("team2_id");

-- CreateIndex
CREATE INDEX "matches_winner_id_idx" ON "public"."matches"("winner_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_fixture_id_match_number_key" ON "public"."matches"("fixture_id", "match_number");

-- CreateIndex
CREATE INDEX "media_entity_id_idx" ON "public"."media"("entity_id");

-- CreateIndex
CREATE INDEX "media_uploaded_by_idx" ON "public"."media"("uploaded_by");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_created_by_idx" ON "public"."notifications"("created_by");

-- CreateIndex
CREATE INDEX "notifications_related_entity_id_idx" ON "public"."notifications"("related_entity_id");

-- CreateIndex
CREATE INDEX "notifications_broadcast_id_idx" ON "public"."notifications"("broadcast_id");

-- CreateIndex
CREATE INDEX "notifications_delivery_status_idx" ON "public"."notifications"("delivery_status");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_idx" ON "public"."notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "notification_templates_category_idx" ON "public"."notification_templates"("category");

-- CreateIndex
CREATE INDEX "notification_templates_is_active_idx" ON "public"."notification_templates"("is_active");

-- CreateIndex
CREATE INDEX "notification_broadcasts_status_idx" ON "public"."notification_broadcasts"("status");

-- CreateIndex
CREATE INDEX "notification_broadcasts_created_by_idx" ON "public"."notification_broadcasts"("created_by");

-- CreateIndex
CREATE INDEX "notification_broadcasts_scheduled_for_idx" ON "public"."notification_broadcasts"("scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_key" ON "public"."notification_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "public"."system_config"("key");

-- CreateIndex
CREATE INDEX "location_cluster_mappings_event_id_idx" ON "public"."location_cluster_mappings"("event_id");

-- CreateIndex
CREATE INDEX "location_cluster_mappings_cluster_venue_mapping_id_idx" ON "public"."location_cluster_mappings"("cluster_venue_mapping_id");

-- CreateIndex
CREATE INDEX "location_cluster_mappings_location_type_idx" ON "public"."location_cluster_mappings"("location_type");

-- CreateIndex
CREATE UNIQUE INDEX "location_cluster_mappings_event_id_location_type_location_n_key" ON "public"."location_cluster_mappings"("event_id", "location_type", "location_name", "state", "district");

-- CreateIndex
CREATE INDEX "team_photos_team_id_idx" ON "public"."team_photos"("team_id");

-- CreateIndex
CREATE INDEX "team_photos_uploaded_by_idx" ON "public"."team_photos"("uploaded_by");

-- CreateIndex
CREATE INDEX "team_players_team_id_idx" ON "public"."team_players"("team_id");

-- CreateIndex
CREATE INDEX "team_players_user_id_idx" ON "public"."team_players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_players_team_id_user_id_key" ON "public"."team_players"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "team_venue_assignments_team_id_idx" ON "public"."team_venue_assignments"("team_id");

-- CreateIndex
CREATE INDEX "team_venue_assignments_event_id_idx" ON "public"."team_venue_assignments"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_venue_assignments_team_id_event_id_key" ON "public"."team_venue_assignments"("team_id", "event_id");

-- CreateIndex
CREATE INDEX "teams_event_id_idx" ON "public"."teams"("event_id");

-- CreateIndex
CREATE INDEX "teams_sport_id_idx" ON "public"."teams"("sport_id");

-- CreateIndex
CREATE INDEX "teams_captain_id_idx" ON "public"."teams"("captain_id");

-- CreateIndex
CREATE INDEX "teams_verified_by_idx" ON "public"."teams"("verified_by");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "user_verifications_user_id_idx" ON "public"."user_verifications"("user_id");

-- CreateIndex
CREATE INDEX "user_verifications_verified_by_idx" ON "public"."user_verifications"("verified_by");

-- CreateIndex
CREATE INDEX "idx_venue_level_mappings_event_id" ON "public"."venue_level_mappings"("event_id");

-- CreateIndex
CREATE INDEX "idx_venue_level_mappings_venue_id" ON "public"."venue_level_mappings"("venue_id");

-- CreateIndex
CREATE INDEX "idx_venue_level_mappings_level" ON "public"."venue_level_mappings"("level");

-- CreateIndex
CREATE UNIQUE INDEX "venue_level_mappings_unique" ON "public"."venue_level_mappings"("event_id", "venue_id", "level");

-- CreateIndex
CREATE INDEX "idx_venue_location" ON "public"."venues"("district", "state");

-- CreateIndex
CREATE INDEX "idx_venue_pincode" ON "public"."venues"("pincode");

-- CreateIndex
CREATE INDEX "idx_venue_is_active" ON "public"."venues"("is_active");

-- CreateIndex
CREATE INDEX "idx_venue_name" ON "public"."venues"("name");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_event_id" ON "public"."volunteer_assignments"("event_id");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_volunteer_id" ON "public"."volunteer_assignments"("volunteer_id");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_venue_level_mapping_id" ON "public"."volunteer_assignments"("venue_level_mapping_id");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_assigned_by" ON "public"."volunteer_assignments"("assigned_by");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_status" ON "public"."volunteer_assignments"("status");

-- CreateIndex
CREATE INDEX "idx_volunteer_assignments_deleted_at" ON "public"."volunteer_assignments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_assignments_unique" ON "public"."volunteer_assignments"("event_id", "volunteer_id", "venue_level_mapping_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_unique" ON "public"."user_roles"("user_id", "event_id", "role");

-- CreateIndex
CREATE INDEX "idx_chat_message_venue" ON "public"."chat_messages"("venue_id");

-- CreateIndex
CREATE INDEX "idx_chat_message_sender" ON "public"."chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_chat_message_target_type" ON "public"."chat_messages"("target_type");

-- CreateIndex
CREATE INDEX "idx_chat_message_created_at" ON "public"."chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "idx_chat_participant_venue" ON "public"."chat_participants"("venue_id");

-- CreateIndex
CREATE INDEX "idx_chat_participant_user" ON "public"."chat_participants"("user_id");

-- CreateIndex
CREATE INDEX "idx_chat_participant_role" ON "public"."chat_participants"("role");

-- CreateIndex
CREATE UNIQUE INDEX "unique_venue_user" ON "public"."chat_participants"("venue_id", "user_id");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cluster_division_mappings" ADD CONSTRAINT "cluster_division_mappings_cluster_venue_mapping_id_fkey" FOREIGN KEY ("cluster_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cluster_division_mappings" ADD CONSTRAINT "cluster_division_mappings_division_venue_mapping_id_fkey" FOREIGN KEY ("division_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cluster_division_mappings" ADD CONSTRAINT "cluster_division_mappings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_results" ADD CONSTRAINT "fixture_results_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_results" ADD CONSTRAINT "fixture_results_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_results" ADD CONSTRAINT "fixture_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_teams" ADD CONSTRAINT "fixture_teams_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_teams" ADD CONSTRAINT "fixture_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_teams" ADD CONSTRAINT "fixture_teams_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixture_teams" ADD CONSTRAINT "fixture_teams_result_recorded_by_fkey" FOREIGN KEY ("result_recorded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixtures" ADD CONSTRAINT "fixtures_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixtures" ADD CONSTRAINT "fixtures_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fixtures" ADD CONSTRAINT "fixtures_venue_level_mapping_id_fkey" FOREIGN KEY ("venue_level_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_depends_on_match1_id_fkey" FOREIGN KEY ("depends_on_match1_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_depends_on_match2_id_fkey" FOREIGN KEY ("depends_on_match2_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_venue_level_mapping_id_fkey" FOREIGN KEY ("venue_level_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_result_entered_by_fkey" FOREIGN KEY ("result_entered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media" ADD CONSTRAINT "media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media" ADD CONSTRAINT "media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."notification_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_templates" ADD CONSTRAINT "notification_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sport_gender_categories" ADD CONSTRAINT "sport_gender_categories_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_config" ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."location_cluster_mappings" ADD CONSTRAINT "location_cluster_mappings_cluster_venue_mapping_id_fkey" FOREIGN KEY ("cluster_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."location_cluster_mappings" ADD CONSTRAINT "location_cluster_mappings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_photos" ADD CONSTRAINT "team_photos_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_photos" ADD CONSTRAINT "team_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_players" ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_players" ADD CONSTRAINT "team_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_cluster_venue_mapping_id_fkey" FOREIGN KEY ("cluster_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_division_venue_mapping_id_fkey" FOREIGN KEY ("division_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_final_venue_mapping_id_fkey" FOREIGN KEY ("final_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_venue_assignments" ADD CONSTRAINT "team_venue_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_tournament_number_venue_mapping_id_fkey" FOREIGN KEY ("tournament_number_venue_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_profile_images" ADD CONSTRAINT "user_profile_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_profile_images" ADD CONSTRAINT "user_profile_images_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_verifications" ADD CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_verifications" ADD CONSTRAINT "user_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venue_level_mappings" ADD CONSTRAINT "venue_level_mappings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venue_level_mappings" ADD CONSTRAINT "venue_level_mappings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_venue_level_mapping_id_fkey" FOREIGN KEY ("venue_level_mapping_id") REFERENCES "public"."venue_level_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
