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
    id: "9f73280e-5e79-4d4e-adf7-bcf88ace3431",
    firstName: "Current",
    lastName: "Volunteer",
    fullName: "Current Volunteer",
    email: "volunteer@isha.foundation",
    phone: "+919876543220",
    role: "technical_volunteer"
  },
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

// VENUE LEVEL MAPPINGS (Updated with actual IDs)
const venueLevelMappings = [
  {
    id: "8d81ed70-e80c-4a79-b9f8-096cea520e96",
    eventId: "20f2f8d1-0ecb-4e9e-b047-d21e999e5111",
    venueId: "550e8400-e29b-41d4-a716-446655440003",
    level: "division",
    isActive: true
  },
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
    state: "Telangana",
    clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440201",
    divisionVenueMappingId: "8d81ed70-e80c-4a79-b9f8-096cea520e96",
    autoAssigned: false
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440402",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    state: "Tamil Nadu",
    clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440203",
    divisionVenueMappingId: "8d81ed70-e80c-4a79-b9f8-096cea520e96",
    autoAssigned: false
  }
];

// LOCATION CLUSTER MAPPINGS
const locationClusterMappings = [
  {
    id: "550e8400-e29b-41d4-a716-446655440501",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    locationName: "ADILABAD",
    state: "Telangana",
    district: "ADILABAD",
    clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440201"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440502",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    locationName: "JOGULAMBA GADWAL",
    state: "Telangana",
    district: "JOGULAMBA GADWAL",
    clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440202"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440503",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    locationType: "district",
    locationName: "COIMBATORE",
    state: "Tamil Nadu",
    district: "COIMBATORE",
    clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440203"
  }
];

// VOLUNTEER ASSIGNMENTS (Fixed to match schema)
const volunteerAssignments = [
  {
    id: "dd87a82a-f0d9-4eb9-9326-1bd27c04e909",
    eventId: "20f2f8d1-0ecb-4e9e-b047-d21e999e5111",
    volunteerId: "9f73280e-5e79-4d4e-adf7-bcf88ace3431",
    venueLevelMappingId: "8d81ed70-e80c-4a79-b9f8-096cea520e96",
    volunteerType: "technical_volunteer",
    status: "assigned"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440602",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    volunteerId: "550e8400-e29b-41d4-a716-446655440104",
    venueLevelMappingId: "550e8400-e29b-41d4-a716-446655440202",
    volunteerType: "general_volunteer",
    status: "assigned"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440603",
    eventId: "550e8400-e29b-41d4-a716-446655440301",
    volunteerId: "550e8400-e29b-41d4-a716-446655440105",
    venueLevelMappingId: "550e8400-e29b-41d4-a716-446655440201",
    volunteerType: "technical_volunteer",
    status: "assigned"
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
