import { Timestamp } from 'firebase/firestore';

// Sample Indian data for realistic test generation
export const sampleData = {
  // Indian first names
  firstNames: {
    male: [
      'Arjun', 'Vikram', 'Rajesh', 'Suresh', 'Deepak', 'Amit', 'Ravi', 'Sanjay', 
      'Manoj', 'Ashok', 'Kiran', 'Ramesh', 'Vinod', 'Anil', 'Prakash', 'Mahesh',
      'Rahul', 'Rohit', 'Vishal', 'Nitin', 'Sachin', 'Ajay', 'Pradeep', 'Sandeep',
      'Gopal', 'Krishna', 'Murali', 'Venkat', 'Srikanth', 'Naveen'
    ],
    female: [
      'Priya', 'Sunita', 'Kavitha', 'Meera', 'Lakshmi', 'Radha', 'Sita', 'Geetha',
      'Anita', 'Rekha', 'Shanti', 'Vasantha', 'Kamala', 'Rukmini', 'Saraswati',
      'Parvati', 'Uma', 'Devi', 'Malathi', 'Sudha', 'Vijaya', 'Pushpa', 'Latha',
      'Sowmya', 'Divya', 'Pooja', 'Sneha', 'Nandini', 'Harini', 'Bhavani'
    ]
  },
  
  // Indian last names
  lastNames: [
    'Kumar', 'Singh', 'Sharma', 'Gupta', 'Reddy', 'Rao', 'Nair', 'Iyer',
    'Krishnan', 'Menon', 'Pillai', 'Chandra', 'Prasad', 'Murthy', 'Sastry',
    'Agarwal', 'Jain', 'Bansal', 'Mittal', 'Shah', 'Patel', 'Modi', 'Mehta',
    'Varma', 'Srinivas', 'Mohan', 'Bhat', 'Hegde', 'Shetty', 'Kamath'
  ],

  // South Indian villages and panchayats
  locations: {
    'Tamil Nadu': {
      districts: ['Coimbatore', 'Chennai', 'Madurai', 'Salem', 'Trichy', 'Vellore'],
      panchayats: [
        'Annur', 'Perur', 'Madukkarai', 'Pollachi', 'Udumalpet',
        'Mettupalayam', 'Coonoor', 'Ooty', 'Gudalur', 'Kotagiri',
        'Dharapuram', 'Kangayam', 'Bhavani', 'Erode', 'Gobichettipalayam'
      ],
      villages: [
        'Veerapandi', 'Kumarapalayam', 'Chinnakallar', 'Periyakallar',
        'Thondamuthur', 'Sarkar Periapalayam', 'Karamadai', 'Siruvani',
        'Narasipuram', 'Vellakoil', 'Palladam', 'Tirupur', 'Avinashi'
      ]
    },
    'Karnataka': {
      districts: ['Bangalore Rural', 'Mysore', 'Mandya', 'Hassan', 'Shimoga', 'Tumkur'],
      panchayats: [
        'Anekal', 'Channapatna', 'Hosakote', 'Doddaballapur', 'Devanahalli',
        'Kanakapura', 'Ramanagara', 'Magadi', 'Kunigal', 'Madhugiri',
        'Sira', 'Pavagada', 'Koratagere', 'Turuvekere', 'Tiptur'
      ],
      villages: [
        'Jigani', 'Bommasandra', 'Attibele', 'Bannerghatta', 'Begur',
        'Sarjapur', 'Varthur', 'Whitefield', 'Brookefield', 'Marathahalli',
        'Bellandur', 'Koramangala', 'BTM Layout', 'JP Nagar', 'Banashankari'
      ]
    },
    'Andhra Pradesh': {
      districts: ['Chittoor', 'Anantapur', 'Kurnool', 'Kadapa', 'Nellore', 'Prakasam'],
      panchayats: [
        'Puttur', 'Tirupati Rural', 'Chittoor Rural', 'Madanapalle',
        'Palamaner', 'Vayalpad', 'Piler', 'Kuppam', 'Bangarupalem',
        'Srikalahasti', 'Satyavedu', 'Nagari', 'Chandragiri', 'Renigunta'
      ],
      villages: [
        'Reddypalayam', 'Narayanavanam', 'Ramachandrapuram', 'Vedurukuppam',
        'Gangadhara Nellore', 'Pakala', 'Gudupalle', 'Penumur', 'Thottambedu',
        'Kalakada', 'Mamandur', 'Sodam', 'Puthalapattu', 'Yerravaripalem'
      ]
    },
    'Kerala': {
      districts: ['Palakkad', 'Thrissur', 'Ernakulam', 'Kottayam', 'Idukki', 'Wayanad'],
      panchayats: [
        'Coimbatore', 'Pollachi', 'Kinathukadavu', 'Anamalais', 'Valparai',
        'Alathur', 'Chittur', 'Nemmara', 'Kollengode', 'Ottapalam',
        'Shoranur', 'Pattambi', 'Thrithala', 'Kuzhalmannam', 'Mannarkkad'
      ],
      villages: [
        'Metupalayam', 'Walayar', 'Coimbatore', 'Karamadai', 'Mettupalayam',
        'Siruvani', 'Anaikatti', 'Marudamalai', 'Velliangiri', 'Perur',
        'Narasimhanaickenpalayam', 'Kalapatti', 'Saravanampatti', 'Vadavalli'
      ]
    }
  },

  // Sports list
  sports: [
    'Volleyball', 'Throwball', 'Kabbadi', 'Kho Kho', 'Football', 
    'Cricket', 'Badminton', 'Carrom', 'Chess', 'Athletics',
    'Basketball', 'Table Tennis', 'Wrestling', 'Boxing'
  ],

  // Phone number prefixes (Indian mobile)
  phonePrefix: ['9', '8', '7', '6'],

  // Instagram handle prefixes
  instagramPrefixes: ['the_', 'i_am_', 'official_', 'real_', 'mr_', 'ms_', '']
};

// Utility functions for generating random data
export const generators = {
  // Generate random Indian phone number
  generatePhoneNumber(): string {
    const prefix = sampleData.phonePrefix[Math.floor(Math.random() * sampleData.phonePrefix.length)];
    const remaining = Math.floor(Math.random() * 900000000) + 100000000; // 9 digits
    return `${prefix}${remaining}`;
  },

  // Generate random date of birth (18-45 years old)
  generateDOB(): string {
    const today = new Date();
    const minAge = 18;
    const maxAge = 45;
    
    const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    
    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    const randomDate = new Date(randomTime);
    
    return randomDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  },

  // Generate random gender
  generateGender(): 'M' | 'F' {
    return Math.random() > 0.5 ? 'M' : 'F';
  },

  // Generate random name based on gender
  generateName(gender: 'M' | 'F'): { firstName: string; lastName: string } {
    const firstNames = gender === 'M' ? sampleData.firstNames.male : sampleData.firstNames.female;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = sampleData.lastNames[Math.floor(Math.random() * sampleData.lastNames.length)];
    
    return { firstName, lastName };
  },

  // Generate random location
  generateLocation(): {
    state: string;
    district: string;
    panchayat: string;
    village: string;
    pincode: string;
  } {
    const states = Object.keys(sampleData.locations);
    const state = states[Math.floor(Math.random() * states.length)];
    const stateData = sampleData.locations[state as keyof typeof sampleData.locations];
    
    const district = stateData.districts[Math.floor(Math.random() * stateData.districts.length)];
    const panchayat = stateData.panchayats[Math.floor(Math.random() * stateData.panchayats.length)];
    const village = stateData.villages[Math.floor(Math.random() * stateData.villages.length)];
    
    // Generate random 6-digit pincode
    const pincode = Math.floor(Math.random() * 900000) + 100000;
    
    return {
      state,
      district,
      panchayat,
      village,
      pincode: pincode.toString()
    };
  },

  // Generate Instagram handle
  generateInstagramHandle(firstName: string, lastName: string): string {
    const prefix = sampleData.instagramPrefixes[Math.floor(Math.random() * sampleData.instagramPrefixes.length)];
    const suffix = Math.floor(Math.random() * 1000);
    const name = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
    
    return `${prefix}${name}${suffix > 100 ? suffix : ''}`;
  },

  // Generate random sport
  generateSport(): string {
    return sampleData.sports[Math.floor(Math.random() * sampleData.sports.length)];
  },

  // Generate random team name
  generateTeamName(location: string, sport: string): string {
    const prefixes = ['Royal', 'Super', 'Elite', 'Rising', 'Dynamic', 'Thunder', 'Lightning', 'Victory'];
    const suffixes = ['Warriors', 'Champions', 'Tigers', 'Lions', 'Eagles', 'Panthers', 'Strikers', 'United'];
    
    const useLocation = Math.random() > 0.5;
    const useSport = Math.random() > 0.3;
    
    let name = '';
    
    if (useLocation) {
      name += location + ' ';
    } else {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      name += prefix + ' ';
    }
    
    if (useSport && sport !== 'Mixed') {
      name += sport + ' ';
    }
    
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    name += suffix;
    
    return name;
  },

  // Generate future date (for events)
  generateFutureDate(monthsFromNow: number = 1): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthsFromNow, now.getDate() + Math.floor(Math.random() * 28));
  },

  // Generate Firestore Timestamp
  generateTimestamp(date?: Date): Timestamp {
    return Timestamp.fromDate(date || new Date());
  },

  // Generate random user role
  generateUserRole(): 'player' | 'captain' | 'general_volunteer' | 'technical_volunteer' | 'verification_volunteer' {
    const roles = ['player', 'player', 'player', 'captain', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'];
    return roles[Math.floor(Math.random() * roles.length)] as any;
  },

  // Generate coordinates near Coimbatore (Isha Yoga Center region)
  generateCoordinates(): { latitude: number; longitude: number } {
    // Base coordinates around Isha Yoga Center
    const baseLat = 11.0168;
    const baseLng = 76.9558;
    
    // Add small random offset (within ~50km radius)
    const latOffset = (Math.random() - 0.5) * 0.5; // ~55km
    const lngOffset = (Math.random() - 0.5) * 0.5; // ~55km
    
    return {
      latitude: baseLat + latOffset,
      longitude: baseLng + lngOffset
    };
  }
};

// Batch generators for creating multiple records
export const batchGenerators = {
  // Generate multiple users
  generateUsers(count: number): any[] {
    const users = [];
    for (let i = 0; i < count; i++) {
      const gender = generators.generateGender();
      const { firstName, lastName } = generators.generateName(gender);
      const location = generators.generateLocation();
      const phoneNumber = generators.generatePhoneNumber();
      const whatsappNumber = Math.random() > 0.3 ? phoneNumber : generators.generatePhoneNumber();
      
      users.push({
        uid: `test_user_${i + 1}_${Date.now()}`,
        firstName,
        lastName,
        phoneNumber,
        whatsappNumber,
        dob: generators.generateDOB(),
        gender,
        village: location.village,
        panchayat: location.panchayat,
        taluk: location.district,
        district: location.district,
        state: location.state,
        pincode: location.pincode,
        preferredLanguage: 'en',
        instagramHandle: generators.generateInstagramHandle(firstName, lastName),
        role: generators.generateUserRole(),
        isProfileComplete: Math.random() > 0.2,
        isVerified: Math.random() > 0.3,
        documents: {
          profilePhoto: { storagePath: '', verified: false, uploadedAt: null, uploadedBy: null, url: null },
          aadhaarFront: { storagePath: '', verified: false, uploadedAt: null, uploadedBy: null, url: null },
          aadhaarBack: { storagePath: '', verified: false, uploadedAt: null, uploadedBy: null, url: null },
          teamPhoto: { storagePath: '', verified: false, uploadedAt: null, uploadedBy: null, url: null }
        },
        createdAt: generators.generateTimestamp(),
        updatedAt: generators.generateTimestamp()
      });
    }
    return users;
  }
};