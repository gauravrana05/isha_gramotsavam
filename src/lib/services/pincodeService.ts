interface PincodeResponse {
  state: string;
  pincode: string;
  countryiso2: string;
  defaultcity: string;
  acceptedCities: string[];
  acceptedTaluks: string[];
  serviceable: boolean;
}

export interface AddressData {
  taluk: string;
  district: string;
  state: string;
}

interface DistrictResponse {
  state: string;
  countryiso2: string;
  acceptedDistricts: string[];
}

interface DistrictDetailsResponse {
  state: string;
  countryiso2: string;
  district: string;
  acceptedTaluks: string[];
  acceptedPanchayats: string[];
}

interface PanchayatResponse {
  state: string;
  countryiso2: string;
  district: string;
  taluk: string;
  acceptedPanchayats: string[];
}

export const pincodeService = {
  async getAddressByPincode(pincode: string): Promise<AddressData> {
    try {
      const response = await fetch(`https://online.sadhguru.org/validation_api/countries/IN/pincodes/${pincode}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: PincodeResponse = await response.json();
      
      if (!data || !data.serviceable || !data.state) {
        throw new Error("Invalid pincode or no data found");
      }
      
      return {
        taluk: data.acceptedTaluks[0] || "",
        district: data.defaultcity || "",
        state: data.state || "",
      };
    } catch (error) {
      console.error("Error fetching pincode data:", error);
      throw new Error("Failed to fetch address data");
    }
  },

  async getDistrictsByState(state: string): Promise<string[]> {
    try {
      const response = await fetch(`https://online.sadhguru.org/validation_api/countries/IN/state/${encodeURIComponent(state)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DistrictResponse = await response.json();
      
      if (!data || !data.acceptedDistricts?.length) {
        throw new Error("No districts found for the specified state");
      }
      
      return data.acceptedDistricts;
    } catch (error) {
      console.error("Error fetching districts:", error);
      throw new Error("Failed to fetch districts");
    }
  },

  async getTaluksByDistrict(state: string, district: string): Promise<{ taluks: string[]; panchayats: string[] }> {
    try {
      const response = await fetch(
        `https://online.sadhguru.org/validation_api/countries/IN/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DistrictDetailsResponse = await response.json();
      
      if (!data || (!data.acceptedTaluks?.length && !data.acceptedPanchayats?.length)) {
        throw new Error("No taluks or panchayats found for the specified district");
      }
      
      return {
        taluks: data.acceptedTaluks || [],
        panchayats: data.acceptedPanchayats || [],
      };
    } catch (error) {
      console.error("Error fetching taluks and panchayats:", error);
      throw new Error("Failed to fetch taluks and panchayats");
    }
  },

  async getPanchayatsByTaluk(state: string, district: string, taluk: string): Promise<string[]> {
    try {
      const response = await fetch(
        `https://online.sadhguru.org/validation_api/countries/IN/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}/taluk/${encodeURIComponent(taluk)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: PanchayatResponse = await response.json();
      
      if (!data || !data.acceptedPanchayats?.length) {
        throw new Error("No panchayats found for the specified taluk");
      }
      
      return data.acceptedPanchayats;
    } catch (error) {
      console.error("Error fetching panchayats:", error);
      throw new Error("Failed to fetch panchayats");
    }
  },

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://online.sadhguru.org/validation_api/countries/IN/pincodes/110001');
      return response.ok;
    } catch {
      return false;
    }
  }
};