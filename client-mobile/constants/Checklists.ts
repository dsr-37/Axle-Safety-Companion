export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface RoleChecklist {
  role: string;
  items: ChecklistItem[];
  lastUpdated: Date;
}

export const ROLE_CHECKLISTS: Record<string, ChecklistItem[]> = {
  driller: [
    {
      id: 'drill-1',
      title: 'Inspect drilling equipment',
      description: 'Check drill bits, cables, and hydraulic systems',
      completed: false,
      priority: 'high',
      category: 'Equipment'
    },
    {
      id: 'drill-2',
      title: 'Verify emergency stops',
      description: 'Test all emergency stop buttons and safety switches',
      completed: false,
      priority: 'high',
      category: 'Safety'
    },
    {
      id: 'drill-3',
      title: 'Check ground stability',
      description: 'Inspect work area for loose rocks or unstable ground',
      completed: false,
      priority: 'high',
      category: 'Environment'
    },
    {
      id: 'drill-4',
      title: 'Confirm PPE compliance',
      description: 'Verify hard hat, safety glasses, and hearing protection',
      completed: false,
      priority: 'medium',
      category: 'PPE'
    },
    {
      id: 'drill-5',
      title: 'Document drilling parameters',
      description: 'Record depth, angle, and hole specifications',
      completed: false,
      priority: 'medium',
      category: 'Documentation'
    }
  ],
  electrician: [
    {
      id: 'elec-1',
      title: 'Check for proper insulation',
      description: 'Inspect all electrical cables and connections',
      completed: false,
      priority: 'high',
      category: 'Safety'
    },
    {
      id: 'elec-2',
      title: 'Verify lockout-tagout',
      description: 'Ensure LOTO procedures are properly implemented',
      completed: false,
      priority: 'high',
      category: 'Safety'
    },
    {
      id: 'elec-3',
      title: 'Test ground fault protection',
      description: 'Verify GFCI functionality on all circuits',
      completed: false,
      priority: 'high',
      category: 'Equipment'
    },
    {
      id: 'elec-4',
      title: 'Inspect portable tools',
      description: 'Check condition of portable electrical tools',
      completed: false,
      priority: 'medium',
      category: 'Equipment'
    },
    {
      id: 'elec-5',
      title: 'Update maintenance logs',
      description: 'Record all electrical maintenance activities',
      completed: false,
      priority: 'medium',
      category: 'Documentation'
    }
  ],
  operator: [
    {
      id: 'op-1',
      title: 'Pre-operation machinery check',
      description: 'Inspect all moving parts and safety guards',
      completed: false,
      priority: 'high',
      category: 'Equipment'
    },
    {
      id: 'op-2',
      title: 'Verify communication systems',
      description: 'Test radios and emergency communication devices',
      completed: false,
      priority: 'high',
      category: 'Communication'
    },
    {
      id: 'op-3',
      title: 'Check fluid levels',
      description: 'Verify hydraulic, oil, and coolant levels',
      completed: false,
      priority: 'medium',
      category: 'Maintenance'
    },
    {
      id: 'op-4',
      title: 'Inspect work area',
      description: 'Clear obstacles and ensure safe working conditions',
      completed: false,
      priority: 'medium',
      category: 'Environment'
    },
    {
      id: 'op-5',
      title: 'Review job procedures',
      description: 'Confirm understanding of daily work tasks',
      completed: false,
      priority: 'low',
      category: 'Procedures'
    }
  ],
  supervisor: [
    {
      id: 'sup-1',
      title: 'Team safety briefing',
      description: 'Conduct daily safety meeting with all workers',
      completed: false,
      priority: 'high',
      category: 'Leadership'
    },
    {
      id: 'sup-2',
      title: 'Site inspection walkthrough',
      description: 'Complete comprehensive site safety inspection',
      completed: false,
      priority: 'high',
      category: 'Inspection'
    },
    {
      id: 'sup-3',
      title: 'Review incident reports',
      description: 'Check and respond to any safety incidents',
      completed: false,
      priority: 'high',
      category: 'Documentation'
    },
    {
      id: 'sup-4',
      title: 'Equipment status review',
      description: 'Verify all equipment maintenance schedules',
      completed: false,
      priority: 'medium',
      category: 'Equipment'
    },
    {
      id: 'sup-5',
      title: 'Weather and environmental check',
      description: 'Assess weather conditions and environmental hazards',
      completed: false,
      priority: 'medium',
      category: 'Environment'
    }
  ]
};