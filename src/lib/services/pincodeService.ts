export interface PincodeResponse {
  Message: string;
  Status: string;
  PostOffice: Array<{
    Name: string;
    Description: string;
    BranchType: string;
    DeliveryStatus: string;
    Taluk: string;
    Circle: string;
    District: string;
    Division: string;
    Region: string;
    State: string;
    Country: string;
  }>;
}

export interface AddressData {
  taluk: string;
  district: string;
  state: string;
}

export const pincodeService = {
  async getAddressByPincode(pincode: string): Promise<AddressData> {
    try {
      // Use local Go CORS proxy server
      const response = await fetch(`http://localhost:8080/pincode/${pincode}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: PincodeResponse = await response.json();
      
      if (!data) {
        throw new Error("No data received");
      }
      console.log("This is the response: " , data);
      if (data.Status !== "Success" || !data?.PostOffice?.length) {
        throw new Error("Invalid pincode or no data found");
      }
      
      const firstRecord = data.PostOffice[0];
      return {
        taluk: firstRecord.Taluk || "",
        district: firstRecord.District || "",
        state: firstRecord.State || "",
      };
      
    } catch (error) {
      console.error("Error fetching pincode data:", error);
      
      // Provide helpful error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Could not connect to proxy server. Make sure it's running on port 8080.");
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("Failed to fetch address data");
    }
  },

  // Test method to check proxy connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8080/health');
      return response.ok;
    } catch {
      return false;
    }
  }
};