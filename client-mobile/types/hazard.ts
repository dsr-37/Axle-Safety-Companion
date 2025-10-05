export interface HazardReport {
  id: string;
  userId: string;
  reporterName?: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  category: 'equipment' | 'environmental' | 'procedural' | 'structural' | 'chemical' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  mediaFiles: HazardMedia[];
  audioUri?: string;
  voiceTranscription?: string;
  timestamp: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  supervisorNotes?: string;
  actionsTaken?: string[];
  tags?: string[];
}

export interface HazardMedia {
  id: string;
  type: 'image' | 'video';
  uri: string;
  uploadUrl?: string;
  thumbnail?: string;
  fileSize?: number;
  duration?: number; // for videos
  capturedAt: Date;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  userName?: string;
  userRole?: string;
  type: 'emergency_sos' | 'medical' | 'fire' | 'evacuation' | 'gas_leak';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  message?: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  responseTime?: number; // in minutes
  respondedBy?: string[];
  notes?: string;
}