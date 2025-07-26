// src/hooks/common/usePincodeValidation.ts
import { useState, useCallback } from 'react';
import { pincodeService, AddressData } from '@/lib/services/pincodeService';

interface UsePincodeValidationReturn {
  loading: boolean;
  verified: boolean;
  error: string | null;
  addressData: AddressData | null;
  validatePincode: (pincode: string) => Promise<void>;
  clearValidation: () => void;
}

export const usePincodeValidation = (): UsePincodeValidationReturn => {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const validatePincode = useCallback(async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      setVerified(false);
      setAddressData(null);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const data = await pincodeService.getAddressByPincode(pincode);
      
      if (data) {
        setAddressData(data);
        setVerified(true);
        setError(null);
      } else {
        // This case might be rare now, but handle it
        setError('No address data found for this pincode.');
        setVerified(false);
        setAddressData(null);
      }
    } catch (err: any) {
      console.error("Hook caught error:", err); // Log the error caught by the hook
      // Provide a more user-friendly message, potentially including the original error
      const userMessage = err.message || 'Failed to validate pincode. Please try again.';
      setError(userMessage); 
      setVerified(false);
      setAddressData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setLoading(false);
    setVerified(false);
    setError(null);
    setAddressData(null);
  }, []);

  return {
    loading,
    verified,
    error,
    addressData,
    validatePincode,
    clearValidation
  };
};
