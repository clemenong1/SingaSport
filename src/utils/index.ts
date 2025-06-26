// Utility functions exports
export * from './userService';

// Add more utility exports as needed
// export * from './formatters';
// export * from './validators'; 

/**
 * Determines if a court is currently open based on its opening hours
 * @param openingHours - Array of opening hours strings from Google Places API (weekday_text format)
 * @returns boolean indicating if the court is currently open, or null if data is unavailable
 */
export function isCourtCurrentlyOpen(openingHours: string[] | null | undefined): boolean | null {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) {
    return null; // No opening hours data available
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Format: HHMM (e.g., 1430 for 2:30 PM)

  // Map JavaScript's day numbering to Google's weekday_text format
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[currentDay];

  // Find today's opening hours
  const todayHours = openingHours.find(hours => 
    hours.toLowerCase().startsWith(currentDayName.toLowerCase())
  );

  if (!todayHours) {
    return null; // No data for today
  }

  // Check if closed all day
  if (todayHours.toLowerCase().includes('closed')) {
    return false;
  }

  // Extract time ranges from the string
  // Example formats: "Monday: 6:00 AM – 10:00 PM" or "Monday: Open 24 hours"
  if (todayHours.toLowerCase().includes('open 24 hours') || todayHours.toLowerCase().includes('24 hours')) {
    return true;
  }

  // Parse time ranges (handle formats like "6:00 AM – 10:00 PM")
  const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    // If we can't parse the time format, assume it's open (conservative approach)
    return true;
  }

  const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;

  // Convert to 24-hour format
  let openTime = parseInt(startHour) * 100 + parseInt(startMin);
  let closeTime = parseInt(endHour) * 100 + parseInt(endMin);

  // Handle AM/PM conversion
  if (startPeriod.toUpperCase() === 'PM' && parseInt(startHour) !== 12) {
    openTime += 1200;
  } else if (startPeriod.toUpperCase() === 'AM' && parseInt(startHour) === 12) {
    openTime -= 1200;
  }

  if (endPeriod.toUpperCase() === 'PM' && parseInt(endHour) !== 12) {
    closeTime += 1200;
  } else if (endPeriod.toUpperCase() === 'AM' && parseInt(endHour) === 12) {
    closeTime -= 1200;
  }

  // Handle cases where closing time is past midnight (e.g., 11:00 PM - 2:00 AM)
  if (closeTime < openTime) {
    // Court closes after midnight
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Normal case: court opens and closes on the same day
    return currentTime >= openTime && currentTime <= closeTime;
  }
} 