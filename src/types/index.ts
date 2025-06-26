// Main types export file
export interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  // Add more user properties as needed
}

export interface GeofenceData {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// Add more common types as needed 