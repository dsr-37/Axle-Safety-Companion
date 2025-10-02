export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  requiredForRole?: string[];
  estimatedTime?: number; // in minutes
  instructions?: string;
  relatedVideos?: string[];
}

export interface RoleChecklist {
  role: string;
  items: ChecklistItem[];
  lastUpdated: Date;
  version: string;
}

export interface ChecklistProgress {
  userId: string;
  date: string;
  role: string;
  items: ChecklistItem[];
  completedAt?: Date;
  completionRate: number;
  timeSpent?: number; // in minutes
  notes?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  roles: string[];
  items: ChecklistItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}