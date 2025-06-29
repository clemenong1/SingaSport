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
}

export interface GeofenceData {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface GameSchedule {
  id?: string;
  basketballCourt: string;
  courtName: string;
  address: string;
  scheduledTime: Date;
  peopleAttending: number;
  createdBy: string;
  createdAt: Date;
  rsvpUsers: string[];
  maxPlayers?: number;
  gameType?: string;
  skillLevel?: string;
  description?: string;
}

export interface BasketballCourtExtended extends Court {
  gameSchedules?: string[];
  peopleNumber?: number;
  geohash?: string;
  openingHours?: string[] | null;
}
