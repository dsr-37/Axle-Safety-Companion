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
  maintenance: [
    {
      id: 'maint-1',
      title: 'Inspect maintenance tools',
      description: 'Check wrenches, hoists, and diagnostic tools for defects',
      completed: false,
      priority: 'high',
      category: 'Equipment'
    },
    {
      id: 'maint-2',
      title: 'Verify spare parts inventory',
      description: 'Ensure critical spare parts are available on site',
      completed: false,
      priority: 'medium',
      category: 'Logistics'
    },
    {
      id: 'maint-3',
      title: 'Lubrication checks',
      description: 'Confirm lubrication schedules and grease points are serviced',
      completed: false,
      priority: 'medium',
      category: 'Maintenance'
    },
    {
      id: 'maint-4',
      title: 'Safety interlocks test',
      description: 'Test safety interlocks and guards after maintenance',
      completed: false,
      priority: 'high',
      category: 'Safety'
    },
    {
      id: 'maint-5',
      title: 'Document maintenance actions',
      description: 'Record maintenance performed and parts used',
      completed: false,
      priority: 'medium',
      category: 'Documentation'
    },
    {
      id: 'maint-6',
      title: 'Verify test run',
      description: 'Run equipment after maintenance to verify correct operation',
      completed: false,
      priority: 'medium',
      category: 'Verification'
    }
  ],
  general: [
    {
      id: 'gen-1',
      title: 'Personal protective equipment check',
      description: 'Ensure PPE is worn and in good condition',
      completed: false,
      priority: 'high',
      category: 'PPE'
    },
    {
      id: 'gen-2',
      title: 'Tool inspection',
      description: 'Inspect hand tools for damage or wear',
      completed: false,
      priority: 'medium',
      category: 'Equipment'
    },
    {
      id: 'gen-3',
      title: 'Work area housekeeping',
      description: 'Clear debris and secure loose items in the work area',
      completed: false,
      priority: 'medium',
      category: 'Environment'
    },
    {
      id: 'gen-4',
      title: 'Communicate hazards',
      description: 'Report any observed hazards to supervisor',
      completed: false,
      priority: 'high',
      category: 'Communication'
    },
    {
      id: 'gen-5',
      title: 'Follow daily procedures',
      description: 'Review and follow assigned task procedures',
      completed: false,
      priority: 'low',
      category: 'Procedures'
    },
    {
      id: 'gen-6',
      title: 'Log activities',
      description: 'Record any maintenance or unusual observations',
      completed: false,
      priority: 'low',
      category: 'Documentation'
    }
  ]
};