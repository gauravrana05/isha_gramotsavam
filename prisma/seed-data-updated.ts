// Updated seed data with proper UUIDs

// VENUES (from current database)
const venues = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Venue 1",
    address: "venue 1 Address Road",
    panchayat: null,
    taluk: null,
    district: "ADILABAD",
    state: "Telangana",
    pincode: "504001",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Finals Venue",
    address: "final venue Address",
    panchayat: null,
    taluk: null,
    district: "COIMBATORE",
    state: "Tamil Nadu",
    pincode: "641114",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Div Venue 1",
    address: "Div venue address",
    panchayat: null,
    taluk: null,
    district: "JOGULAMBA GADWAL",
    state: "Telangana",
    pincode: "504001",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Venue 2",
    address: "cluster venue address",
    panchayat: null,
    taluk: null,
    district: "ADILABAD",
    state: "Telangana",
    pincode: "504001",
    isActive: true
  }
];

// USERS (sample based on roles we saw)
const users = [
  {
    id: "550e8400-e29b-41d4-a716-446655440101",
    firstName: "Admin",
    lastName: "User",
    fullName: "Admin User",
    email: "admin@isha.foundation",
    phone: "+919876543210",
    role: "admin"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440102",
    firstName: "Team",
    lastName: "Captain",
    fullName: "Team Captain",
    email: "captain@example.com",
    phone: "+919876543211",
    role: "captain"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440103",
    firstName: "Verification",
    lastName: "Volunteer 1",
    fullName: "Verification Volunteer 1",
    email: "verify1@isha.foundation",
    phone: "+919876543212",
    role: "verification_volunteer"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440104",
    firstName: "Verification",
    lastName: "Volunteer 2",
    fullName: "Verification Volunteer 2",
    email: "verify2@isha.foundation",
    phone: "+919876543213",
    role: "verification_volunteer"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440105",
    firstName: "Technical",
    lastName: "Volunteer 1",
    fullName: "Technical Volunteer 1",
    email: "tech1@isha.foundation",
    phone: "+919876543214",
    role: "technical_volunteer"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440106",
    firstName: "Technical",
    lastName: "Volunteer 2",
    fullName: "Technical Volunteer 2",
    email: "tech2@isha.foundation",
    phone: "+919876543215",
    role: "technical_volunteer"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440107",
    firstName: "Technical",
    lastName: "Volunteer 3",
    fullName: "Technical Volunteer 3",
    email: "tech3@isha.foundation",
    phone: "+919876543216",
    role: "technical_volunteer"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440108",
    firstName: "Public",
    lastName: "User 1",
    fullName: "Public User 1",
    email: "user1@example.com",
    phone: "+919876543217",
    role: "public"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440109",
    firstName: "Public",
    lastName: "User 2",
    fullName: "Public User 2",
    email: "user2@example.com",
    phone: "+919876543218",
    role: "public"
  }
];

// VENUE LEVEL MAPPINGS
const venueLevelMappings = [
  {
    id: "550e8400-e29b-41d4-a716-446655440201",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    venueId: "550e8400-e29b-41d4-a716-446655440001",
    level: "cluster",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440202",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    venueId: "550e8400-e29b-41d4-a716-446655440004",
    level: "cluster",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440203",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    venueId: "550e8400-e29b-41d4-a716-446655440003",
    level: "division",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440204",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    venueId: "550e8400-e29b-41d4-a716-446655440002",
    level: "final",
    isActive: true
  }
];

// CLUSTER DIVISION MAPPINGS
const clusterDivisionMappings = [
  {
    id: "550e8400-e29b-41d4-a716-446655440401",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    clusterId: "cluster-telangana-north",
    divisionId: "division-south-india",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440402",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    clusterId: "cluster-tamil-nadu-west",
    divisionId: "division-south-india",
    isActive: true
  }
];

// LOCATION CLUSTER MAPPINGS
const locationClusterMappings = [
  {
    id: "550e8400-e29b-41d4-a716-446655440501",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    district: "ADILABAD",
    state: "Telangana",
    clusterId: "cluster-telangana-north",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440502",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    district: "JOGULAMBA GADWAL",
    state: "Telangana",
    clusterId: "cluster-telangana-north",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440503",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    district: "COIMBATORE",
    state: "Tamil Nadu",
    clusterId: "cluster-tamil-nadu-west",
    isActive: true
  }
];

// VOLUNTEER ASSIGNMENTS
const volunteerAssignments = [
  {
    id: "550e8400-e29b-41d4-a716-446655440601",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    userId: "550e8400-e29b-41d4-a716-446655440103",
    venueId: "550e8400-e29b-41d4-a716-446655440001",
    role: "verification_volunteer",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440602",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    userId: "550e8400-e29b-41d4-a716-446655440104",
    venueId: "550e8400-e29b-41d4-a716-446655440004",
    role: "verification_volunteer",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440603",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    userId: "550e8400-e29b-41d4-a716-446655440105",
    venueId: "550e8400-e29b-41d4-a716-446655440001",
    role: "technical_volunteer",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440604",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    userId: "550e8400-e29b-41d4-a716-446655440106",
    venueId: "550e8400-e29b-41d4-a716-446655440004",
    role: "technical_volunteer",
    isActive: true
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440605",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    userId: "550e8400-e29b-41d4-a716-446655440107",
    venueId: "550e8400-e29b-41d4-a716-446655440003",
    role: "technical_volunteer",
    isActive: true
  }
];

// Export all data
export {
  venues,
  users,
  venueLevelMappings,
  clusterDivisionMappings,
  locationClusterMappings,
  volunteerAssignments
};
