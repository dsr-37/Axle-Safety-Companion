export interface UserProfile {
  id: string;
  employeeId?: string;
  phoneNumber?: string;
  email?: string;
  role: string;
  name: string;
  department?: string;
  supervisorId?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: {
    language: string;
    notifications: boolean;
    offlineMode: boolean;
  };
  createdAt: Date;
  lastActive: Date;
  isActive?: boolean;
  // 0-100 safety score (computed from checklist completion and report history)
  safetyScore?: number;
  // Location scoping identifiers (state -> coalfield -> mine)
  stateId?: string;
  stateName?: string;
  coalfieldId?: string;
  coalfieldName?: string;
  mineId?: string;
  mineName?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    emergencyAlerts: boolean;
    hazardUpdates: boolean;
  };
  offline: {
    autoSync: boolean;
    wifiOnly: boolean;
    maxStorageSize: number;
  };
  privacy: {
    shareLocation: boolean;
    anonymizeReports: boolean;
  };
}

export interface AuthState {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends LoginCredentials {
  name: string;
  employeeId?: string;
  role: string;
}