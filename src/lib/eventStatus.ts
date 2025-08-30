export type EventStatus = 'draft' | 'registration_open' | 'registration_closed' | 'active' | 'completed' | 'cancelled';

export const calculateEventStatus = (
  registrationStartDate: Date, 
  registrationEndDate: Date, 
  startDate: Date, 
  endDate: Date
): EventStatus => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
  
  // Convert input dates to start of day for comparison
  const regStart = new Date(registrationStartDate.getFullYear(), registrationStartDate.getMonth(), registrationStartDate.getDate());
  const regEnd = new Date(registrationEndDate.getFullYear(), registrationEndDate.getMonth(), registrationEndDate.getDate());
  const eventStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const eventEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  if (today < regStart) {
    return 'draft'; // Before registration opens
  } else if (today >= regStart && today <= regEnd) {
    return 'registration_open'; // Registration period
  } else if (today > regEnd && today < eventStart) {
    return 'registration_closed'; // Between registration end and event start
  } else if (today >= eventStart && today <= eventEnd) {
    return 'active'; // Event is happening
  } else if (today > eventEnd) {
    return 'completed'; // Event finished
  }
  
  return 'draft'; // Fallback
};

export const validateEventDates = (
  registrationStartDate: Date,
  registrationEndDate: Date,
  startDate: Date,
  endDate: Date
): string | null => {
  if (registrationStartDate >= registrationEndDate) {
    return 'Registration end date must be after registration start date';
  }
  
  if (registrationEndDate > startDate) {
    return 'Event start date must be after registration end date';
  }
  
  if (startDate >= endDate) {
    return 'Event end date must be after event start date';
  }
  
  return null; // No validation errors
};
