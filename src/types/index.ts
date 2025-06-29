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

// Game scheduling types
export interface GameSchedule {
  id?: string; // Firestore document ID
  basketballCourt: string; // placeId_of_court
  courtName: string; // name of the court
  address: string; // full address of the court
  scheduledTime: Date; // when the game is scheduled
  peopleAttending: number; // number incremented/decremented on RSVP
  createdBy: string; // userId who created the game
  createdAt: Date;
  rsvpUsers: string[]; // array of user IDs who RSVP'd
  maxPlayers?: number; // optional maximum capacity
  gameType?: string; // e.g., "pickup", "tournament", "casual"
  skillLevel?: string; // e.g., "beginner", "intermediate", "advanced"
  description?: string; // optional description/notes
}

export interface BasketballCourtExtended extends Court {
  gameSchedules?: string[]; // array of game schedule document IDs
  peopleNumber?: number;
  geohash?: string;
  openingHours?: string[] | null;
}

// Add more common types as needed 