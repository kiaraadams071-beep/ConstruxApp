export type UserRole = 'admin' | 'contractor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  company?: string;
  contactInfo?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'planned' | 'in-progress' | 'completed';
  weather?: {
    temp: number;
    condition: string;
    updatedAt: string;
  };
  createdAt: string;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  projectId: string;
  timestamp: any; // Firestore Timestamp
  selfieUrl: string;
  latitude: number;
  longitude: number;
  verified: boolean;
}

export interface ProgressReport {
  id?: string;
  projectId: string;
  reporterId: string;
  timestamp: any;
  description: string;
  percentageDone: number;
  materialsUsed: MaterialEntry[];
  photoUrls: string[];
  weatherConditions?: string;
}

export interface MaterialEntry {
  name: string;
  quantity: string;
  unit: string;
}

export interface RiskRow {
  id: string;
  source: 'Baseline' | 'Photo' | 'Manual';
  category: 'Physical' | 'Chemical' | 'Biological' | 'Ergonomic' | 'Psychosocial';
  hazard: string;
  impact: string;
  likelihood: number; // 1-5
  severity: number; // 1-5
  riskScore: number;
  controls: string;
  status: 'draft' | 'confirmed';
  requiresReview: boolean;
}

export interface RiskDoc {
  id?: string;
  projectId: string;
  projectName: string;
  location: string;
  author: string;
  date: string;
  activity: string;
  rows: RiskRow[];
}

export interface PhotoHints {
  detectedHazards: string[];
  suggestedControls: Record<string, string>;
  confidence: number;
}
