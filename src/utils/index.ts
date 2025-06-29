export * from './userService';

export function isCourtCurrentlyOpen(openingHours: string[] | null | undefined): boolean | null {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[currentDay];

  const todayHours = openingHours.find(hours =>
    hours.toLowerCase().startsWith(currentDayName.toLowerCase())
  );

  if (!todayHours) {
    return null;
  }

  if (todayHours.toLowerCase().includes('closed')) {
    return false;
  }

  if (todayHours.toLowerCase().includes('open 24 hours') || todayHours.toLowerCase().includes('24 hours')) {
    return true;
  }

  const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!timeMatch) {
    return true;
  }

  const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;

  let openTime = parseInt(startHour) * 100 + parseInt(startMin);
  let closeTime = parseInt(endHour) * 100 + parseInt(endMin);

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

  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    return currentTime >= openTime && currentTime <= closeTime;
  }
}
