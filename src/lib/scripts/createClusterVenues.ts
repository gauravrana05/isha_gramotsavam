'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// District data organized by state
const DISTRICTS_BY_STATE = {
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 
    'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur', 
    'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 
    'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 
    'Tenkasi', 'Thanjavur', 'Theni', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 
    'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Tuticorin', 'Vellore', 
    'Viluppuram', 'Virudhunagar'
  ],
  'Andhra Pradesh': [
    'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Kadapa', 'Krishna', 
    'Kurnool', 'Nellore', 'Srikakulam', 'Visakhapatnam', 'West Godavari'
  ],
  'Telangana': [
    'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 
    'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 
    'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 
    'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 
    'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 
    'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 
    'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri', 'Hanumakonda'
  ],
  'Odisha': [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 
    'Debagarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 
    'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 
    'Puri', 'Rayagada', 'Sambalpur', 'Sonepur', 'Sundargarh'
  ]
};

// Venue name templates
const VENUE_PREFIXES = ['District', 'Central', 'Municipal', 'Government'];
const VENUE_TYPES = ['High School', 'Sports Stadium', 'Sports Complex', 'Community Center', 'College Ground', 'Sports Club'];
const VENUE_SUFFIXES = ['Grounds', 'Arena', 'Sports Complex', 'Stadium'];

// Generate approximate coordinates for district centers (simplified)
function generateCoordinatesForDistrict(district: string, state: string) {
  // Base coordinates for each state (approximate center)
  const stateCoords = {
    'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
    'Andhra Pradesh': { lat: 15.9129, lng: 79.7400 },
    'Telangana': { lat: 18.1124, lng: 79.0193 },
    'Odisha': { lat: 20.9517, lng: 85.0985 }
  };

  const baseCoord = stateCoords[state as keyof typeof stateCoords];
  
  // Add some variation based on district name hash
  const hash = district.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const latVariation = (hash % 200 - 100) / 100; // -1 to +1 degree variation
  const lngVariation = (hash % 300 - 150) / 100; // -1.5 to +1.5 degree variation

  return {
    latitude: baseCoord.lat + latVariation,
    longitude: baseCoord.lng + lngVariation
  };
}

// Generate venue name
function generateVenueName(district: string) {
  const prefix = VENUE_PREFIXES[Math.floor(Math.random() * VENUE_PREFIXES.length)];
  const type = VENUE_TYPES[Math.floor(Math.random() * VENUE_TYPES.length)];
  return `${prefix} ${district} ${type}`;
}

// Generate short name
function generateShortName(fullName: string, district: string) {
  const words = fullName.split(' ');
  if (words.length <= 2) return fullName;
  
  // Take first letter of each word except district name
  const initials = words
    .filter(word => word !== district)
    .map(word => word.charAt(0))
    .join('');
  
  return `${district.substring(0, 8)} ${initials}`;
}

// Generate phone number with appropriate state code
function generatePhoneNumber(state: string) {
  const stateCodes = {
    'Tamil Nadu': '044',
    'Andhra Pradesh': '040',
    'Telangana': '040', 
    'Odisha': '0674'
  };
  
  const stateCode = stateCodes[state as keyof typeof stateCodes] || '044';
  const number = Math.floor(Math.random() * 90000000) + 10000000; // 8 digit number
  return `+91${stateCode}${number}`;
}

// Generate contact person name
function generateContactName() {
  const firstNames = ['Rajesh', 'Priya', 'Suresh', 'Kavitha', 'Ramesh', 'Meera', 'Vikram', 'Sita'];
  const lastNames = ['Kumar', 'Sharma', 'Reddy', 'Nair', 'Patel', 'Singh', 'Rao', 'Das'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

// Generate pincode based on state
function generatePincode(state: string) {
  const statePincodePrefix = {
    'Tamil Nadu': '6',
    'Andhra Pradesh': '5',
    'Telangana': '5',
    'Odisha': '7'
  };
  
  const prefix = statePincodePrefix[state as keyof typeof statePincodePrefix] || '6';
  const suffix = Math.floor(Math.random() * 90000) + 10000; // 5 digit suffix
  return `${prefix}${suffix}`;
}

// Fetch sports data from the sports collection
async function getSportsData() {
  try {
    const sportsSnapshot = await adminDb.collection('sports')
      .where('isActive', '==', true)
      .get();
    
    const sports = sportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    type SportDoc = { id: string; name?: string; displayName?: string };

    const volleyballSport = (sports as SportDoc[]).find(sport => 
      (typeof sport.name === 'string' && sport.name.toLowerCase() === 'volleyball') ||
      (typeof sport.displayName === 'string' && sport.displayName.toLowerCase() === 'volleyball')
    );
    
    const throwballSport = (sports as SportDoc[]).find(sport => 
      (typeof sport.name === 'string' && sport.name.toLowerCase() === 'throwball') ||
      (typeof sport.displayName === 'string' && sport.displayName.toLowerCase() === 'throwball')
    );

    if (!volleyballSport || !throwballSport) {
      throw new Error('Required sports (Volleyball and Throwball) not found in sports collection');
    }

    return {
      volleyball: {
        sportId: volleyballSport.id,
        sportName: volleyballSport.displayName || volleyballSport.name,
        courtCount: '2',
        courtSpecifications: 'Standard volleyball court 18x9m with 2.43m net height'
      },
      throwball: {
        sportId: throwballSport.id,
        sportName: throwballSport.displayName || throwballSport.name,
        courtCount: '1',
        courtSpecifications: 'Throwball court 12.2x18.3m with 2.2m net height'
      }
    };
  } catch (error) {
    console.error('Error fetching sports data:', error);
    throw error;
  }
}

export async function createAllClusterVenues() {
  try {
    console.log('Starting creation of all cluster venues...');
    
    // First fetch sports data
    console.log('Fetching sports data from collection...');
    const sportsData = await getSportsData();
    console.log('Sports data fetched:', sportsData);
    
    const batch = adminDb.batch();
    const venueIds: string[] = [];
    let venueCount = 0;

    // Process each state and its districts
    for (const [state, districts] of Object.entries(DISTRICTS_BY_STATE)) {
      console.log(`Processing ${state} with ${districts.length} districts...`);
      
      for (const district of districts) {
        const venueName = generateVenueName(district);
        const shortName = generateShortName(venueName, district);
        const coordinates = generateCoordinatesForDistrict(district, state);
        const pincode = generatePincode(state);
        const contactName = generateContactName();
        const contactPhone = generatePhoneNumber(state);

        // Create venue document
        const venueRef = adminDb.collection('venues').doc();
        const venueId = venueRef.id;
        venueIds.push(venueId);

        const venueData = {
          // Basic Information
          name: venueName,
          shortName: shortName,
          type: 'cluster',
          
          // Location
          address: `Sports Complex Road, ${district}, ${state}`,
          pincode: pincode,
          district: district,
          state: state,
          coordinates: coordinates,
          
          // Sports Configuration (using real sports IDs from collection)
          supportedSports: [
            sportsData.volleyball,
            sportsData.throwball
          ],
          
          // Contact Information
          primaryContact: {
            name: contactName,
            phone: contactPhone,
            role: 'Venue Coordinator'
          },
          
          // Staff Assignments (minimal)
          assignedVolunteers: [],
          officials: {
            referees: []
          },
          
          // Status & Utilization
          isActive: true,
          currentStatus: 'available',
          totalMatchesHosted: 0,
          upcomingMatches: 0,
          utilizationRate: 0,
          
          // Event Association
          eventId: 'isha_gramotsavam_2025',
          
          // Audit Fields
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };

        batch.set(venueRef, venueData);
        venueCount++;

        // Commit batch every 500 operations (Firestore limit)
        if (venueCount % 500 === 0) {
          await batch.commit();
          console.log(`Committed batch of 500 venues. Total processed: ${venueCount}`);
        }
      }
    }

    // Commit remaining venues
    if (venueCount % 500 !== 0) {
      await batch.commit();
    }

    console.log(`Successfully created ${venueCount} cluster venues`);
    return {
      success: true,
      message: `Created ${venueCount} cluster venues across ${Object.keys(DISTRICTS_BY_STATE).length} states`,
      venueCount,
      venueIds
    };

  } catch (error) {
    console.error('Error creating cluster venues:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getClusterVenuesCount() {
  try {
    const venuesSnapshot = await adminDb.collection('venues')
      .where('type', '==', 'cluster')
      .where('eventId', '==', 'isha_gramotsavam_2025')
      .get();

    return {
      success: true,
      count: venuesSnapshot.docs.length
    };

  } catch (error) {
    console.error('Error getting cluster venues count:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteAllClusterVenues() {
  try {
    console.log('Deleting all cluster venues...');
    
    // Get all cluster venues for the event
    const venuesSnapshot = await adminDb.collection('venues')
      .where('type', '==', 'cluster')
      .where('eventId', '==', 'isha_gramotsavam_2025')
      .get();

    if (venuesSnapshot.empty) {
      return {
        success: true,
        message: 'No cluster venues found to delete',
        deletedCount: 0
      };
    }

    // Delete in batches
    const batchSize = 500;
    let deletedCount = 0;
    const venueIds = venuesSnapshot.docs.map(doc => doc.id);

    for (let i = 0; i < venueIds.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchVenueIds = venueIds.slice(i, i + batchSize);

      for (const venueId of batchVenueIds) {
        const venueRef = adminDb.collection('venues').doc(venueId);
        batch.delete(venueRef);
        deletedCount++;
      }

      await batch.commit();
      console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} (${batchVenueIds.length} venues)`);
    }

    console.log(`Successfully deleted ${deletedCount} cluster venues`);
    return {
      success: true,
      message: `Deleted ${deletedCount} cluster venues`,
      deletedCount
    };

  } catch (error) {
    console.error('Error deleting cluster venues:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}