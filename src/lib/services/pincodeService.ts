// src/lib/services/pincodeService.ts
export interface AddressData {
    name: string;
    pincode: string;
    district: string;
    state: string;
    block?: string;
    taluk?: string;
    panchayat?: string;
    region?: string;
    circle?: string;
    division?: string;
  }
  
  export interface PincodeApiResponse {
    message: string;
    status: string;
    postOffice: AddressData[] | null;
  }
  
  class PincodeService {
    // Ensure the URL is correct
    private readonly baseUrl = 'https://api.postalpincode.in'; // No trailing space
  
    async getAddressByPincode(pincode: string): Promise<AddressData | null> {
      try {
        if (!/^\d{6}$/.test(pincode)) {
          throw new Error('Invalid pincode format. Please enter a 6-digit pincode.');
        }
  
        const url = `${this.baseUrl}/pincode/${pincode}`;
        console.log(`Fetching pincode data from: ${url}`); // Debug log
  
        const response = await fetch(url);
  
        console.log(`API Response Status: ${response.status}`); // Debug log
  
        if (!response.ok) {
          const errorText = await response.text(); // Try to get error text
          console.error(`API Error Text: ${errorText}`); // Log error text
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
  
        const data: PincodeApiResponse[] = await response.json();
  
        console.log('Raw API Response Data:', JSON.stringify(data, null, 2)); // Debug log full response
  
        if (!data || data.length === 0) {
          throw new Error('No data received from API');
        }
  
        const result = data[0];
        console.log('First Result Object:', result); // Debug log first result
  
        // Check if status is explicitly 'Error'
        if (result.status === 'Error') {
           console.warn(`API returned status 'Error' with message: ${result.message}`);
           throw new Error(result.message || 'API reported an error');
        }
  
        // Check if postOffice data exists and is an array
        if (!result.postOffice || !Array.isArray(result.postOffice) || result.postOffice.length === 0) {
          console.warn('API response structure issue:', { postOffice: result.postOffice, message: result.message });
          // Sometimes the API might return status 'Success' but still no data
          if (result.status === 'Success') {
             console.warn('API status was Success, but postOffice array is empty or missing.');
             throw new Error('Pincode is valid, but no associated post office data found.');
          } else {
             throw new Error('Invalid pincode or no data found');
          }
        }
  
        const mainPostOffice = result.postOffice[0];
        console.log('Main Post Office Data:', mainPostOffice); // Debug log selected data
  
        return {
          name: mainPostOffice.name || '',
          pincode: mainPostOffice.pincode || pincode,
          district: mainPostOffice.district || '',
          state: mainPostOffice.state || '',
          block: mainPostOffice.block || '',
          taluk: mainPostOffice.taluk || '',
          panchayat: mainPostOffice.panchayat || '',
          region: mainPostOffice.region || '',
          circle: mainPostOffice.circle || '',
          division: mainPostOffice.division || ''
        };
  
      } catch (error) {
        console.error('Error in getAddressByPincode:', error);
        // Re-throw the error so the calling component can handle it
        throw error;
      }
    }
  
    async validatePincode(pincode: string): Promise<boolean> {
      try {
        const address = await this.getAddressByPincode(pincode);
        return address !== null;
      } catch (error) {
        console.error('Pincode validation failed:', error);
        return false;
      }
    }
  }
  
  export const pincodeService = new PincodeService();
  