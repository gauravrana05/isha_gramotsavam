import * as XLSX from 'xlsx';

export interface VenueExcelRow {
  Name: string;
  ShortName: string;
  Type: 'cluster' | 'division' | 'final';
  District: string;
  State: string;
  Address: string;
  Pincode: string;
  'Contact Name': string;
  'Contact Phone': string;
  'Contact Role': string;
  Latitude: number;
  Longitude: number;
  Sports: string; // 'volleyball', 'throwball', or 'both'
}

export interface ParsedVenueData {
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  address: string;
  pincode: string;
  district: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  supportedSports: Array<{
    sportId: string;
    sportName: string;
    courtCount: string;
    courtSpecifications: string;
  }>;
  primaryContact: {
    name: string;
    phone: string;
    role: string;
  };
  assignedVolunteers: string[];
  officials: {
    referees: string[];
  };
  isActive: boolean;
  currentStatus: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  totalMatchesHosted: number;
  upcomingMatches: number;
  utilizationRate: number;
  eventId: string;
}

export interface ExcelValidationError {
  row: number;
  field: string;
  message: string;
}

// Required fields for venue creation
const REQUIRED_FIELDS = [
  'Name', 'ShortName', 'Type', 'District', 'State', 'Address', 'Pincode',
  'Contact Name', 'Contact Phone', 'Contact Role', 'Latitude', 'Longitude', 'Sports'
];

// Valid venue types
const VALID_TYPES = ['cluster', 'division', 'final'];

// Valid sports
const VALID_SPORTS = ['volleyball', 'throwball', 'both'];

// Generate venue template
export function generateVenueExcelTemplate(): Uint8Array {
  const templateData = [
    {
      'Name': 'District Coimbatore High School',
      'ShortName': 'Coimbatore DHS',
      'Type': 'cluster',
      'District': 'Coimbatore',
      'State': 'Tamil Nadu',
      'Address': 'Sports Complex Road, Coimbatore, Tamil Nadu',
      'Pincode': '641001',
      'Contact Name': 'Rajesh Kumar',
      'Contact Phone': '+910442345678',
      'Contact Role': 'Venue Coordinator',
      'Latitude': 11.0168,
      'Longitude': 76.9558,
      'Sports': 'both'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  const columnWidths = [
    { wch: 30 }, // Name
    { wch: 15 }, // ShortName
    { wch: 10 }, // Type
    { wch: 15 }, // District
    { wch: 15 }, // State
    { wch: 40 }, // Address
    { wch: 10 }, // Pincode
    { wch: 20 }, // Contact Name
    { wch: 15 }, // Contact Phone
    { wch: 18 }, // Contact Role
    { wch: 12 }, // Latitude
    { wch: 12 }, // Longitude
    { wch: 12 }  // Sports
  ];
  
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Venues Template');

  // Write to buffer
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

// Parse uploaded Excel file
export function parseVenueExcelFile(file: File): Promise<{
  data: VenueExcelRow[];
  errors: ExcelValidationError[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as VenueExcelRow[];
        
        // Validate data
        const { validData, errors } = validateExcelData(jsonData);
        
        resolve({
          data: validData,
          errors
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Validate Excel data
function validateExcelData(data: any[]): {
  validData: VenueExcelRow[];
  errors: ExcelValidationError[];
} {
  const errors: ExcelValidationError[] = [];
  const validData: VenueExcelRow[] = [];

  if (!data || data.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'Excel file is empty or has no data rows'
    });
    return { validData, errors };
  }

  data.forEach((row, index) => {
    const rowNumber = index + 2; // Excel row number (accounting for header)
    let isValidRow = true;

    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!row[field] || row[field] === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `Required field '${field}' is missing or empty`
        });
        isValidRow = false;
      }
    });

    // Validate specific fields
    if (row.Type && !VALID_TYPES.includes(row.Type.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'Type',
        message: `Type must be one of: ${VALID_TYPES.join(', ')}`
      });
      isValidRow = false;
    }

    if (row.Sports && !VALID_SPORTS.includes(row.Sports.toLowerCase())) {
      errors.push({
        row: rowNumber,
        field: 'Sports',
        message: `Sports must be one of: ${VALID_SPORTS.join(', ')}`
      });
      isValidRow = false;
    }

    // Validate latitude/longitude
    if (row.Latitude) {
      const lat = parseFloat(row.Latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push({
          row: rowNumber,
          field: 'Latitude',
          message: 'Latitude must be a number between -90 and 90'
        });
        isValidRow = false;
      }
    }

    if (row.Longitude) {
      const lng = parseFloat(row.Longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push({
          row: rowNumber,
          field: 'Longitude',
          message: 'Longitude must be a number between -180 and 180'
        });
        isValidRow = false;
      }
    }

    // Validate phone number format
    if (row['Contact Phone']) {
      const phone = row['Contact Phone'].toString();
      if (!phone.match(/^\+91\d{10,11}$/)) {
        errors.push({
          row: rowNumber,
          field: 'Contact Phone',
          message: 'Phone number must be in format +91XXXXXXXXXX'
        });
        isValidRow = false;
      }
    }

    // Validate pincode
    if (row.Pincode) {
      const pincode = row.Pincode.toString();
      if (!pincode.match(/^\d{6}$/)) {
        errors.push({
          row: rowNumber,
          field: 'Pincode',
          message: 'Pincode must be exactly 6 digits'
        });
        isValidRow = false;
      }
    }

    if (isValidRow) {
      validData.push(row);
    }
  });

  return { validData, errors };
}

// Convert Excel row to venue data
// Note: This function will need sports data to be passed to it for real sports IDs
export function convertExcelRowToVenueData(row: VenueExcelRow, sportsData?: any): ParsedVenueData {
  // Generate supported sports based on Sports field
  const supportedSports = [];
  
  if (row.Sports.toLowerCase() === 'volleyball' || row.Sports.toLowerCase() === 'both') {
    supportedSports.push({
      sportId: sportsData?.volleyball?.sportId || 'volleyball',
      sportName: sportsData?.volleyball?.sportName || 'Volleyball',
      courtCount: '2',
      courtSpecifications: 'Standard volleyball court 18x9m with 2.43m net height'
    });
  }
  
  if (row.Sports.toLowerCase() === 'throwball' || row.Sports.toLowerCase() === 'both') {
    supportedSports.push({
      sportId: sportsData?.throwball?.sportId || 'throwball',
      sportName: sportsData?.throwball?.sportName || 'Throwball',
      courtCount: '1',
      courtSpecifications: 'Throwball court 12.2x18.3m with 2.2m net height'
    });
  }

  return {
    name: row.Name.trim(),
    shortName: row.ShortName.trim(),
    type: row.Type.toLowerCase() as 'cluster' | 'division' | 'final',
    address: row.Address.trim(),
    pincode: row.Pincode.toString(),
    district: row.District.trim(),
    state: row.State.trim(),
    coordinates: {
      latitude: parseFloat(row.Latitude.toString()),
      longitude: parseFloat(row.Longitude.toString())
    },
    supportedSports,
    primaryContact: {
      name: row['Contact Name'].trim(),
      phone: row['Contact Phone'].toString(),
      role: row['Contact Role'].trim()
    },
    assignedVolunteers: [],
    officials: {
      referees: []
    },
    isActive: true,
    currentStatus: 'available',
    totalMatchesHosted: 0,
    upcomingMatches: 0,
    utilizationRate: 0,
    eventId: 'isha_gramotsavam_2025'
  };
}