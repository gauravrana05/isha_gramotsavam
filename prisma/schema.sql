-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

-- DROP TYPE public."AssignmentMethod";

CREATE TYPE public."AssignmentMethod" AS ENUM (
	'auto_assigned',
	'manual_assigned');

-- DROP TYPE public."AssignmentStatus";

CREATE TYPE public."AssignmentStatus" AS ENUM (
	'assigned',
	'confirmed',
	'active',
	'completed');

-- DROP TYPE public."EventStatus";

CREATE TYPE public."EventStatus" AS ENUM (
	'draft',
	'registration_open',
	'registration_closed',
	'active',
	'completed',
	'cancelled');

-- DROP TYPE public."FixtureStatus";

CREATE TYPE public."FixtureStatus" AS ENUM (
	'draft',
	'teams_assigned',
	'in_progress',
	'completed');

-- DROP TYPE public."Gender";

CREATE TYPE public."Gender" AS ENUM (
	'M',
	'F',
	'O');

-- DROP TYPE public."GenderCategory";

CREATE TYPE public."GenderCategory" AS ENUM (
	'men',
	'women',
	'mixed');

-- DROP TYPE public."MatchStatus";

CREATE TYPE public."MatchStatus" AS ENUM (
	'scheduled',
	'ready',
	'in_progress',
	'completed',
	'cancelled');

-- DROP TYPE public."MediaEntity";

CREATE TYPE public."MediaEntity" AS ENUM (
	'match',
	'event',
	'venue');

-- DROP TYPE public."MediaStatus";

CREATE TYPE public."MediaStatus" AS ENUM (
	'pending',
	'approved',
	'rejected');

-- DROP TYPE public."NotificationType";

CREATE TYPE public."NotificationType" AS ENUM (
	'info',
	'success',
	'warning',
	'error',
	'team_invitation',
	'verification_update',
	'match_result',
	'venue_assignment');

-- DROP TYPE public."PlayerPosition";

CREATE TYPE public."PlayerPosition" AS ENUM (
	'main',
	'substitute');

-- DROP TYPE public."TeamStatus";

CREATE TYPE public."TeamStatus" AS ENUM (
	'draft',
	'submitted',
	'verified',
	'rejected',
	'checked_in');

-- DROP TYPE public."TournamentLevel";

CREATE TYPE public."TournamentLevel" AS ENUM (
	'cluster',
	'division',
	'final');

-- DROP TYPE public."UserRole";

CREATE TYPE public."UserRole" AS ENUM (
	'admin',
	'captain',
	'player',
	'general_volunteer',
	'technical_volunteer',
	'verification_volunteer',
	'public');

-- DROP TYPE public."VerificationStatus";

CREATE TYPE public."VerificationStatus" AS ENUM (
	'pending',
	'verified',
	'approved',
	'rejected');

-- DROP TYPE public."VerificationType";

CREATE TYPE public."VerificationType" AS ENUM (
	'document_verification',
	'onground_verification');

-- DROP TYPE public."VolunteerType";

CREATE TYPE public."VolunteerType" AS ENUM (
	'general_volunteer',
	'technical_volunteer');
-- public."_prisma_migrations" definition

-- Drop table

-- DROP TABLE public."_prisma_migrations";

CREATE TABLE public."_prisma_migrations" (
	id varchar(36) NOT NULL,
	checksum varchar(64) NOT NULL,
	finished_at timestamptz NULL,
	migration_name varchar(255) NOT NULL,
	logs text NULL,
	rolled_back_at timestamptz NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	applied_steps_count int4 DEFAULT 0 NOT NULL,
	CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY (id)
);


-- public.sports definition

-- Drop table

-- DROP TABLE public.sports;

CREATE TABLE public.sports (
	id uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NULL,
	main_players_count int4 NOT NULL,
	max_substitutes int4 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT sports_pkey PRIMARY KEY (id)
);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid NOT NULL,
	phone varchar(20) NOT NULL,
	email varchar(255) NULL,
	"role" public."UserRole" DEFAULT 'public'::"UserRole" NOT NULL,
	language_preference varchar(10) DEFAULT 'en'::character varying NULL,
	profile_complete bool DEFAULT false NOT NULL,
	first_name varchar(100) NULL,
	last_name varchar(100) NULL,
	date_of_birth date NULL,
	"gender" public."Gender" NULL,
	whatsapp_number varchar(20) NULL,
	instagram_handle varchar(100) NULL,
	panchayat varchar(100) NULL,
	taluk varchar(100) NULL,
	district varchar(100) NULL,
	state varchar(100) NULL,
	pincode varchar(10) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX users_phone_key ON public.users USING btree (phone);


-- public.venues definition

-- Drop table

-- DROP TABLE public.venues;

CREATE TABLE public.venues (
	id uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	capacity int4 NULL,
	panchayat varchar(100) NULL,
	taluk varchar(100) NULL,
	district varchar(100) NOT NULL,
	state varchar(100) NOT NULL,
	pincode varchar(10) NULL,
	contact_phone varchar(20) NULL,
	contact_email varchar(255) NULL,
	contact_person varchar(100) NULL,
	facilities text NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT venues_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_venue_is_active ON public.venues USING btree (is_active);
CREATE INDEX idx_venue_location ON public.venues USING btree (district, state);
CREATE INDEX idx_venue_name ON public.venues USING btree (name);
CREATE INDEX idx_venue_pincode ON public.venues USING btree (pincode);


-- public.audit_logs definition

-- Drop table

-- DROP TABLE public.audit_logs;

CREATE TABLE public.audit_logs (
	id uuid NOT NULL,
	user_id uuid NULL,
	"action" varchar(100) NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id uuid NOT NULL,
	changes jsonb DEFAULT '{}'::jsonb NOT NULL,
	metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comments" text NULL,
	ip_address inet NULL,
	user_agent text NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
	CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);


-- public.events definition

-- Drop table

-- DROP TABLE public.events;

CREATE TABLE public.events (
	id uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	description text NULL,
	registration_start_date date NOT NULL,
	registration_end_date date NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	status public."EventStatus" DEFAULT 'draft'::"EventStatus" NOT NULL,
	created_by uuid NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT events_pkey PRIMARY KEY (id),
	CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public.media definition

-- Drop table

-- DROP TABLE public.media;

CREATE TABLE public.media (
	id uuid NOT NULL,
	file_name varchar(255) NOT NULL,
	file_path varchar(500) NOT NULL,
	file_type varchar(50) NOT NULL,
	"fileSize" int8 NULL,
	entity_type public."MediaEntity" NOT NULL,
	entity_id uuid NOT NULL,
	uploaded_by uuid NULL,
	status public."MediaStatus" DEFAULT 'approved'::"MediaStatus" NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT media_pkey PRIMARY KEY (id),
	CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX media_entity_id_idx ON public.media USING btree (entity_id);
CREATE INDEX media_uploaded_by_idx ON public.media USING btree (uploaded_by);


-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications (
	id uuid NOT NULL,
	user_id uuid NOT NULL,
	title varchar(200) NOT NULL,
	message text NOT NULL,
	"type" public."NotificationType" NOT NULL,
	"read" bool DEFAULT false NOT NULL,
	read_at timestamptz(6) NULL,
	related_entity_type varchar(50) NULL,
	related_entity_id uuid NULL,
	action_url varchar(500) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id),
	CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX notifications_related_entity_id_idx ON public.notifications USING btree (related_entity_id);
CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


-- public.sport_gender_categories definition

-- Drop table

-- DROP TABLE public.sport_gender_categories;

CREATE TABLE public.sport_gender_categories (
	sport_id uuid NOT NULL,
	gender_category public."GenderCategory" NOT NULL,
	CONSTRAINT sport_gender_categories_pkey PRIMARY KEY (sport_id, gender_category),
	CONSTRAINT sport_gender_categories_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- public.system_config definition

-- Drop table

-- DROP TABLE public.system_config;

CREATE TABLE public.system_config (
	id uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	value text NOT NULL,
	description text NULL,
	updated_by uuid NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT system_config_pkey PRIMARY KEY (id),
	CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX system_config_key_key ON public.system_config USING btree (key);


-- public.user_profile_images definition

-- Drop table

-- DROP TABLE public.user_profile_images;

CREATE TABLE public.user_profile_images (
	user_id uuid NOT NULL,
	profile_photo_path varchar(500) NULL,
	aadhaar_front_path varchar(500) NULL,
	aadhaar_back_path varchar(500) NULL,
	all_images_uploaded bool DEFAULT false NOT NULL,
	verified_by uuid NULL,
	verified_at timestamptz(6) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT user_profile_images_pkey PRIMARY KEY (user_id),
	CONSTRAINT user_profile_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT user_profile_images_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);


-- public.user_roles definition

-- Drop table

-- DROP TABLE public.user_roles;

CREATE TABLE public.user_roles (
	id uuid NOT NULL,
	user_id uuid NOT NULL,
	event_id uuid NULL,
	"role" public."UserRole" NOT NULL,
	assigned_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	assigned_by uuid NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT user_roles_pkey PRIMARY KEY (id),
	CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT user_roles_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX user_roles_unique ON public.user_roles USING btree (user_id, event_id, role);


-- public.user_verifications definition

-- Drop table

-- DROP TABLE public.user_verifications;

CREATE TABLE public.user_verifications (
	id uuid NOT NULL,
	user_id uuid NOT NULL,
	verification_type public."VerificationType" NOT NULL,
	verification_status public."VerificationStatus" DEFAULT 'pending'::"VerificationStatus" NOT NULL,
	verified_by uuid NULL,
	verified_at timestamptz(6) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT user_verifications_pkey PRIMARY KEY (id),
	CONSTRAINT user_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT user_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX user_verifications_user_id_idx ON public.user_verifications USING btree (user_id);
CREATE INDEX user_verifications_verified_by_idx ON public.user_verifications USING btree (verified_by);


-- public.venue_location_mappings definition

-- Drop table

-- DROP TABLE public.venue_location_mappings;

CREATE TABLE public.venue_location_mappings (
	id uuid NOT NULL,
	event_id uuid NOT NULL,
	venue_id uuid NOT NULL,
	"level" public."TournamentLevel" NOT NULL,
	max_teams int4 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT venue_location_mappings_pkey PRIMARY KEY (id),
	CONSTRAINT venue_location_mappings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT venue_location_mappings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- public.volunteer_assignments definition

-- Drop table

-- DROP TABLE public.volunteer_assignments;

CREATE TABLE public.volunteer_assignments (
	id uuid NOT NULL,
	event_id uuid NOT NULL,
	volunteer_id uuid NOT NULL,
	venue_location_mapping_id uuid NOT NULL,
	volunteer_type public."VolunteerType" NOT NULL,
	contact_phone varchar(20) NULL,
	status public."AssignmentStatus" DEFAULT 'assigned'::"AssignmentStatus" NOT NULL,
	assigned_by uuid NOT NULL,
	assigned_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT volunteer_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT volunteer_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT volunteer_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT volunteer_assignments_venue_location_mapping_id_fkey FOREIGN KEY (venue_location_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT volunteer_assignments_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_volunteer_assignments_assigned_by ON public.volunteer_assignments USING btree (assigned_by);
CREATE INDEX idx_volunteer_assignments_deleted_at ON public.volunteer_assignments USING btree (deleted_at);
CREATE INDEX idx_volunteer_assignments_event_id ON public.volunteer_assignments USING btree (event_id);
CREATE INDEX idx_volunteer_assignments_status ON public.volunteer_assignments USING btree (status);
CREATE INDEX idx_volunteer_assignments_venue_location_mapping_id ON public.volunteer_assignments USING btree (venue_location_mapping_id);
CREATE INDEX idx_volunteer_assignments_volunteer_id ON public.volunteer_assignments USING btree (volunteer_id);
CREATE UNIQUE INDEX volunteer_assignments_unique ON public.volunteer_assignments USING btree (event_id, volunteer_id, venue_location_mapping_id);


-- public.cluster_division_mappings definition

-- Drop table

-- DROP TABLE public.cluster_division_mappings;

CREATE TABLE public.cluster_division_mappings (
	id uuid NOT NULL,
	event_id uuid NOT NULL,
	state varchar(100) NOT NULL,
	cluster_venue_mapping_id uuid NOT NULL,
	division_venue_mapping_id uuid NOT NULL,
	auto_assigned bool DEFAULT false NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT cluster_division_mappings_pkey PRIMARY KEY (id),
	CONSTRAINT cluster_division_mappings_cluster_venue_mapping_id_fkey FOREIGN KEY (cluster_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT cluster_division_mappings_division_venue_mapping_id_fkey FOREIGN KEY (division_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT cluster_division_mappings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX cluster_division_mappings_event_id_cluster_venue_mapping_id_idx ON public.cluster_division_mappings USING btree (event_id, cluster_venue_mapping_id, division_venue_mapping_id);
CREATE UNIQUE INDEX cluster_division_mappings_event_id_cluster_venue_mapping_id_key ON public.cluster_division_mappings USING btree (event_id, cluster_venue_mapping_id);


-- public.fixtures definition

-- Drop table

-- DROP TABLE public.fixtures;

CREATE TABLE public.fixtures (
	id uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	event_id uuid NULL,
	sport_id uuid NOT NULL,
	venue_location_mapping_id uuid NOT NULL,
	gender_category public."GenderCategory" NOT NULL,
	"level" public."TournamentLevel" NOT NULL,
	status public."FixtureStatus" DEFAULT 'draft'::"FixtureStatus" NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT fixtures_pkey PRIMARY KEY (id),
	CONSTRAINT fixtures_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fixtures_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT fixtures_venue_location_mapping_id_fkey FOREIGN KEY (venue_location_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX fixtures_event_id_sport_id_venue_location_mapping_id_gender_idx ON public.fixtures USING btree (event_id, sport_id, venue_location_mapping_id, gender_category, level);


-- public.taluk_cluster_mappings definition

-- Drop table

-- DROP TABLE public.taluk_cluster_mappings;

CREATE TABLE public.taluk_cluster_mappings (
	id uuid NOT NULL,
	event_id uuid NOT NULL,
	district varchar(100) NOT NULL,
	state varchar(100) NOT NULL,
	taluk varchar(100) NOT NULL,
	cluster_venue_mapping_id uuid NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT taluk_cluster_mappings_pkey PRIMARY KEY (id),
	CONSTRAINT taluk_cluster_mappings_cluster_venue_mapping_id_fkey FOREIGN KEY (cluster_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT taluk_cluster_mappings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX taluk_cluster_mappings_cluster_venue_mapping_id_idx ON public.taluk_cluster_mappings USING btree (cluster_venue_mapping_id);
CREATE UNIQUE INDEX taluk_cluster_mappings_event_id_district_taluk_key ON public.taluk_cluster_mappings USING btree (event_id, district, taluk);
CREATE INDEX taluk_cluster_mappings_event_id_idx ON public.taluk_cluster_mappings USING btree (event_id);


-- public.teams definition

-- Drop table

-- DROP TABLE public.teams;

CREATE TABLE public.teams (
	id uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	description text NULL,
	event_id uuid NULL,
	sport_id uuid NOT NULL,
	captain_id uuid NOT NULL,
	captain_name varchar(200) NOT NULL,
	gender_category public."GenderCategory" NOT NULL,
	status public."TeamStatus" DEFAULT 'draft'::"TeamStatus" NOT NULL,
	panchayat varchar(100) NOT NULL,
	taluk varchar(100) NOT NULL,
	district varchar(100) NOT NULL,
	state varchar(100) NOT NULL,
	pincode varchar(10) NULL,
	current_players int4 DEFAULT 0 NOT NULL,
	current_substitutes int4 DEFAULT 0 NOT NULL,
	tournament_number int4 NULL,
	tournament_number_assigned_at timestamptz(6) NULL,
	tournament_number_venue_mapping_id uuid NULL,
	verified_by uuid NULL,
	verified_at timestamptz(6) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT teams_pkey PRIMARY KEY (id),
	CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT teams_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT teams_tournament_number_venue_mapping_id_fkey FOREIGN KEY (tournament_number_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT teams_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX teams_captain_id_idx ON public.teams USING btree (captain_id);
CREATE INDEX teams_event_id_idx ON public.teams USING btree (event_id);
CREATE INDEX teams_sport_id_idx ON public.teams USING btree (sport_id);
CREATE INDEX teams_verified_by_idx ON public.teams USING btree (verified_by);


-- public.fixture_results definition

-- Drop table

-- DROP TABLE public.fixture_results;

CREATE TABLE public.fixture_results (
	id uuid NOT NULL,
	fixture_id uuid NOT NULL,
	team_id uuid NOT NULL,
	"finalPosition" int4 NOT NULL,
	qualifies_for_next bool DEFAULT false NOT NULL,
	recorded_by uuid NULL,
	recorded_at timestamptz(6) NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT fixture_results_pkey PRIMARY KEY (id),
	CONSTRAINT fixture_results_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fixture_results_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fixture_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX fixture_results_fixture_id_idx ON public.fixture_results USING btree (fixture_id);
CREATE UNIQUE INDEX fixture_results_fixture_id_position_key ON public.fixture_results USING btree (fixture_id, "finalPosition");
CREATE UNIQUE INDEX fixture_results_fixture_id_team_id_key ON public.fixture_results USING btree (fixture_id, team_id);
CREATE INDEX fixture_results_team_id_idx ON public.fixture_results USING btree (team_id);


-- public.fixture_teams definition

-- Drop table

-- DROP TABLE public.fixture_teams;

CREATE TABLE public.fixture_teams (
	fixture_id uuid NOT NULL,
	team_id uuid NOT NULL,
	assigned_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	checked_in bool DEFAULT false NOT NULL,
	checked_in_at timestamptz(6) NULL,
	checked_in_by uuid NULL,
	final_position int4 NULL,
	qualifies_for_next bool DEFAULT false NOT NULL,
	tournament_points int4 NULL,
	result_recorded_at timestamptz(6) NULL,
	result_recorded_by uuid NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT fixture_teams_pkey PRIMARY KEY (fixture_id, team_id),
	CONSTRAINT fixture_teams_checked_in_by_fkey FOREIGN KEY (checked_in_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fixture_teams_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fixture_teams_result_recorded_by_fkey FOREIGN KEY (result_recorded_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fixture_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX fixture_teams_fixture_id_final_position_key ON public.fixture_teams USING btree (fixture_id, final_position);
CREATE INDEX fixture_teams_fixture_id_idx ON public.fixture_teams USING btree (fixture_id);
CREATE INDEX fixture_teams_team_id_idx ON public.fixture_teams USING btree (team_id);


-- public.matches definition

-- Drop table

-- DROP TABLE public.matches;

CREATE TABLE public.matches (
	id uuid NOT NULL,
	fixture_id uuid NOT NULL,
	event_id uuid NULL,
	sport_id uuid NOT NULL,
	venue_location_mapping_id uuid NOT NULL,
	gender_category public."GenderCategory" NOT NULL,
	round_name varchar(100) NOT NULL,
	match_number int4 NOT NULL,
	team1_id uuid NULL,
	team2_id uuid NULL,
	depends_on_match1_id uuid NULL,
	depends_on_match2_id uuid NULL,
	next_match_id uuid NULL,
	next_slot varchar(10) NULL,
	winner_id uuid NULL,
	winner_name varchar(200) NULL,
	team1_score int4 NULL,
	team2_score int4 NULL,
	score_details text NULL,
	result_entered_by uuid NULL,
	result_entered_at timestamptz(6) NULL,
	status public."MatchStatus" DEFAULT 'scheduled'::"MatchStatus" NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT matches_pkey PRIMARY KEY (id),
	CONSTRAINT matches_depends_on_match1_id_fkey FOREIGN KEY (depends_on_match1_id) REFERENCES public.matches(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_depends_on_match2_id_fkey FOREIGN KEY (depends_on_match2_id) REFERENCES public.matches(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT matches_next_match_id_fkey FOREIGN KEY (next_match_id) REFERENCES public.matches(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_result_entered_by_fkey FOREIGN KEY (result_entered_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT matches_venue_location_mapping_id_fkey FOREIGN KEY (venue_location_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX matches_event_id_idx ON public.matches USING btree (event_id);
CREATE INDEX matches_fixture_id_idx ON public.matches USING btree (fixture_id);
CREATE UNIQUE INDEX matches_fixture_id_match_number_key ON public.matches USING btree (fixture_id, match_number);
CREATE INDEX matches_sport_id_idx ON public.matches USING btree (sport_id);
CREATE INDEX matches_team1_id_idx ON public.matches USING btree (team1_id);
CREATE INDEX matches_team2_id_idx ON public.matches USING btree (team2_id);
CREATE INDEX matches_venue_location_mapping_id_idx ON public.matches USING btree (venue_location_mapping_id);
CREATE INDEX matches_winner_id_idx ON public.matches USING btree (winner_id);


-- public.team_photos definition

-- Drop table

-- DROP TABLE public.team_photos;

CREATE TABLE public.team_photos (
	team_id uuid NOT NULL,
	photo_path varchar(500) NOT NULL,
	uploaded_by uuid NULL,
	uploaded_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT team_photos_pkey PRIMARY KEY (team_id),
	CONSTRAINT team_photos_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT team_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX team_photos_team_id_idx ON public.team_photos USING btree (team_id);
CREATE INDEX team_photos_uploaded_by_idx ON public.team_photos USING btree (uploaded_by);


-- public.team_players definition

-- Drop table

-- DROP TABLE public.team_players;

CREATE TABLE public.team_players (
	id uuid NOT NULL,
	team_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"position" public."PlayerPosition" NOT NULL,
	verification_status public."VerificationStatus" DEFAULT 'pending'::"VerificationStatus" NOT NULL,
	first_name varchar(100) NOT NULL,
	last_name varchar(100) NOT NULL,
	phone varchar(20) NOT NULL,
	whatsapp_number varchar(20) NULL,
	date_of_birth date NOT NULL,
	age int4 NOT NULL,
	"gender" public."Gender" NOT NULL,
	panchayat varchar(100) NOT NULL,
	taluk varchar(100) NOT NULL,
	district varchar(100) NOT NULL,
	state varchar(100) NOT NULL,
	pincode varchar(10) NOT NULL,
	added_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	added_by varchar(50) NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT team_players_pkey PRIMARY KEY (id),
	CONSTRAINT team_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT team_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX team_players_team_id_idx ON public.team_players USING btree (team_id);
CREATE UNIQUE INDEX team_players_team_id_user_id_key ON public.team_players USING btree (team_id, user_id);
CREATE INDEX team_players_user_id_idx ON public.team_players USING btree (user_id);


-- public.team_venue_assignments definition

-- Drop table

-- DROP TABLE public.team_venue_assignments;

CREATE TABLE public.team_venue_assignments (
	id uuid NOT NULL,
	team_id uuid NOT NULL,
	event_id uuid NOT NULL,
	"level" public."TournamentLevel" DEFAULT 'cluster'::"TournamentLevel" NOT NULL,
	cluster_venue_mapping_id uuid NOT NULL,
	division_venue_mapping_id uuid NULL,
	final_venue_mapping_id uuid NULL,
	cluster_qualified bool DEFAULT false NOT NULL,
	division_qualified bool DEFAULT false NOT NULL,
	final_qualified bool DEFAULT false NOT NULL,
	assignment_method public."AssignmentMethod" DEFAULT 'auto_assigned'::"AssignmentMethod" NOT NULL,
	assigned_by uuid NOT NULL,
	assigned_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz(6) NOT NULL,
	deleted_at timestamptz(6) NULL,
	CONSTRAINT team_venue_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT team_venue_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT team_venue_assignments_cluster_venue_mapping_id_fkey FOREIGN KEY (cluster_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT team_venue_assignments_division_venue_mapping_id_fkey FOREIGN KEY (division_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT team_venue_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT team_venue_assignments_final_venue_mapping_id_fkey FOREIGN KEY (final_venue_mapping_id) REFERENCES public.venue_location_mappings(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT team_venue_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX team_venue_assignments_event_id_idx ON public.team_venue_assignments USING btree (event_id);
CREATE UNIQUE INDEX team_venue_assignments_team_id_event_id_key ON public.team_venue_assignments USING btree (team_id, event_id);
CREATE INDEX team_venue_assignments_team_id_idx ON public.team_venue_assignments USING btree (team_id);