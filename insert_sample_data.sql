-- Insert sample users for each role
-- Note: Using specific UUIDs for consistency with mock authentication

-- Admin user
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+919876543210', 
    'admin@isha.com', 
    'admin', 
    true,
    'System', 
    'Admin', 
    '1990-01-01', 
    'M',
    'Central Panchayat', 
    'Coimbatore', 
    'Coimbatore', 
    'Tamil Nadu', 
    '641101'
) ON CONFLICT (phone) DO NOTHING;

-- Captain user
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '+919876543211', 
    'captain@example.com', 
    'captain', 
    true,
    'Team', 
    'Captain', 
    '1992-06-15', 
    'M',
    'Sports Panchayat', 
    'Pollachi', 
    'Coimbatore', 
    'Tamil Nadu', 
    '642001'
) ON CONFLICT (phone) DO NOTHING;

-- Player user
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    '+919876543212', 
    'player@example.com', 
    'player', 
    true,
    'Active', 
    'Player', 
    '1995-03-20', 
    'F',
    'Village Panchayat', 
    'Palladam', 
    'Coimbatore', 
    'Tamil Nadu', 
    '641664'
) ON CONFLICT (phone) DO NOTHING;

-- General volunteer
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000004',
    '+919876543213', 
    'volunteer@example.com', 
    'genenral_volunteer', 
    true,
    'Helpful', 
    'Volunteer', 
    '1988-12-10', 
    'M',
    'Service Panchayat', 
    'Mettupalayam', 
    'Coimbatore', 
    'Tamil Nadu', 
    '641301'
) ON CONFLICT (phone) DO NOTHING;

-- Technical volunteer
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000005',
    '+919876543214', 
    'techvolunteer@example.com', 
    'technical_volunteer', 
    true,
    'Tech', 
    'Support', 
    '1993-09-05', 
    'F',
    'Tech Panchayat', 
    'Tirupur', 
    'Tirupur', 
    'Tamil Nadu', 
    '641601'
) ON CONFLICT (phone) DO NOTHING;

-- Verification volunteer
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000006',
    '+919876543215', 
    'verification@example.com', 
    'verification_volunteer', 
    true,
    'Document', 
    'Verifier', 
    '1991-04-18', 
    'M',
    'Verification Panchayat', 
    'Udumalpet', 
    'Tirupur', 
    'Tamil Nadu', 
    '642126'
) ON CONFLICT (phone) DO NOTHING;

-- Public user
INSERT INTO "public"."users" (
    "id", "phone", "email", "role", "profile_complete", 
    "first_name", "last_name", "date_of_birth", "gender",
    "panchayat", "taluk", "district", "state", "pincode"
) VALUES (
    '00000000-0000-0000-0000-000000000007',
    '+919876543216', 
    'public@example.com', 
    'public', 
    true,
    'General', 
    'Public', 
    '1997-11-22', 
    'F',
    'Community Panchayat', 
    'Annur', 
    'Coimbatore', 
    'Tamil Nadu', 
    '641653'
) ON CONFLICT (phone) DO NOTHING;

-- Insert sports: Throwball and Volleyball
INSERT INTO "public"."sports" (
    "id", "name", "description", "main_players_count", "max_substitutes", "is_active"
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Throwball',
    'A team sport played with a ball where players throw the ball over a net to the opposing team court.',
    7,
    5,
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."sports" (
    "id", "name", "description", "main_players_count", "max_substitutes", "is_active"
) VALUES (
    '10000000-0000-0000-0000-000000000002',
    'Volleyball',
    'A team sport in which two teams hit a ball over a high net, trying to make it touch the court within the opponents court.',
    6,
    6,
    true
) ON CONFLICT (id) DO NOTHING;

-- Add sport gender categories for both sports
INSERT INTO "public"."sport_gender_categories" ("sport_id", "gender_category") VALUES
    ('10000000-0000-0000-0000-000000000001', 'men'),
    ('10000000-0000-0000-0000-000000000001', 'women'),
    ('10000000-0000-0000-0000-000000000001', 'mixed'),
    ('10000000-0000-0000-0000-000000000002', 'men'),
    ('10000000-0000-0000-0000-000000000002', 'women'),
    ('10000000-0000-0000-0000-000000000002', 'mixed')
ON CONFLICT (sport_id, gender_category) DO NOTHING;