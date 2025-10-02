export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  requiredForRole?: string[];
  estimatedTime?: number;
  instructions?: string;
  relatedVideos?: string[];
}

export interface HazardReport {
  id?: string;
  userId: string;
  reporterName?: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  category?: 'equipment' | 'environmental' | 'procedural' | 'structural' | 'chemical' | 'other';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  audioUri?: string;
  imageUris?: string[];
  videoUris?: string[];
  voiceTranscription?: string;
  timestamp: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  supervisorNotes?: string;
  actionsTaken?: string[];
  tags?: string[];
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

export interface SyncStatus {
  lastSyncTime?: Date;
  pendingActions: number;
  isOnline: boolean;
  isSyncing: boolean;
  syncErrors: string[];
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  retryAction?: () => void;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}