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

// AI Verification Types
export interface AIVerificationRequest {
  imageUrl: string;
  reportDescription: string;
  courtContext?: string;
}

export interface AIVerificationResponse {
  isMatch: boolean;
  confidence: number;
  reasoning: string;
  feedback?: string;
  timestamp: string;
  promptVersion: string;
}

export interface AIVerificationError {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_IMAGE' | 'PROCESSING_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface ImageUploadStatus {
  phase: 'uploading' | 'analyzing' | 'verified' | 'failed';
  progress: number;
  message: string;
  aiVerification?: AIVerificationResponse;
  error?: AIVerificationError;
}

export interface TempImageData {
  uri: string;
  id: string;
  tempStorageUrl?: string;
  permanentStorageUrl?: string;
  aiVerified?: boolean;
  verificationResponse?: AIVerificationResponse;
}

// Enhanced existing interfaces
export interface Report {
  id: string;
  courtId: string;
  courtName: string;
  description: string;
  user: string;
  userName: string;
  reportedAt: any;
  imageCount: number;
  photoUrls?: string[];
  status: 'open' | 'investigating' | 'resolved';
  aiVerificationStatus?: 'pending' | 'verified' | 'failed';
  verificationDetails?: AIVerificationResponse[];
}

export interface Verification {
  id: string;
  verifierId: string;
  photoUrl: string;
  timestamp: any;
  aiVerified: boolean;
  aiVerificationResponse?: AIVerificationResponse;
  pointsAwarded?: boolean;
}

// Configuration
export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  retryDelay: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  costOptimization: {
    imageCompressionQuality: number;
    maxImageSize: number;
  };
}
