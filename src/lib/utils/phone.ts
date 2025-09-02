/**
 * Phone number utilities for consistent formatting across the application
 */

/**
 * Normalize phone number to E.164 format (+91xxxxxxxxxx)
 * @param phone - Phone number in any format
 * @returns Normalized phone number with +91 prefix
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats
  if (digits.length === 10) {
    // Indian mobile number without country code
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Indian number with country code but no +
    return `+${digits}`;
  } else if (digits.length === 13 && digits.startsWith('91')) {
    // Handle cases where +91 might be stored as 91 with extra digit
    return `+91${digits.slice(2)}`;
  }
  
  // If already has + prefix, return as is
  if (phone.startsWith('+91') && phone.length === 13) {
    return phone;
  }
  
  // Default: assume it's a 10-digit Indian number
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `+91${last10}`;
  }
  
  return null;
}

/**
 * Format phone number for display (removes +91 prefix for Indian numbers)
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone;
  
  // Remove +91 prefix for display
  if (normalized.startsWith('+91')) {
    return normalized.slice(3);
  }
  
  return normalized;
}

/**
 * Validate Indian mobile number
 * @param phone - Phone number to validate
 * @returns True if valid Indian mobile number
 */
export function isValidIndianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  
  // Check if it's a valid Indian mobile number format
  const mobileRegex = /^\+91[6-9]\d{9}$/;
  return mobileRegex.test(normalized);
}

/**
 * Format phone number for database storage (always E.164 format)
 * @param phone - Phone number in any format
 * @returns Phone number in E.164 format for database storage
 */
export function formatPhoneForStorage(phone: string | null | undefined): string | null {
  return normalizePhoneNumber(phone);
}
