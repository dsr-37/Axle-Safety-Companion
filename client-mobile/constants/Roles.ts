export interface WorkerRole {
  id: string;
  title: string;
  description: string;
  icon: string;
  responsibilities: string[];
  safetyPriority: 'high' | 'medium' | 'low';
}

export const WORKER_ROLES: WorkerRole[] = [
  {
    id: 'driller',
    title: 'Driller',
    description: 'Operates drilling equipment and machinery for mining operations',
    icon: 'construct-outline',
    responsibilities: [
      'Inspect drilling equipment daily',
      'Verify emergency stops functionality',
      'Check ground stability',
      'Maintain proper PPE compliance',
      'Document drilling parameters',
      'Quality check drill bits and rods'
    ],
    safetyPriority: 'high'
  },
  {
    id: 'electrician',
    title: 'Electrician',
    description: 'Maintains and repairs electrical systems in mining facilities',
    icon: 'flash-outline',
    responsibilities: [
      'Check electrical insulation',
      'Verify lockout-tagout procedures',
      'Test ground fault protection',
      'Inspect portable tools',
      'Update maintenance logs',
      'Perform voltage checks'
    ],
    safetyPriority: 'high'
  },
  {
    id: 'operator',
    title: 'Equipment Operator',
    description: 'Operates heavy machinery and vehicles in mining operations',
    icon: 'car-outline',
    responsibilities: [
      'Pre-operation machinery checks',
      'Verify communication systems',
      'Check fluid levels',
      'Inspect work area',
      'Review job procedures',
      'Log equipment usage'
    ],
    safetyPriority: 'high'
  },
  {
    id: 'maintenance',
    title: 'Maintenance Worker',
    description: 'Performs routine maintenance and repairs on mining equipment',
    icon: 'build-outline',
    responsibilities: [
      'Equipment maintenance schedules',
      'Tool inspection and calibration',
      'Lubrication and fluid checks',
      'Safety system testing',
      'Maintenance documentation'
    ],
    safetyPriority: 'medium'
  },
  {
    id: 'general',
    title: 'General Worker',
    description: 'Performs various support tasks and general mining operations',
    icon: 'people-outline',
    responsibilities: [
      'Personal safety checks',
      'Tool and equipment inspection',
      'Work area organization',
      'Team communication',
      'Basic safety protocols',
      'Log daily activities'
    ],
    safetyPriority: 'medium'
  }
];

export const getRoleById = (roleId: string): WorkerRole | undefined => {
  return WORKER_ROLES.find(role => role.id === roleId);
};

export const getRolesByPriority = (priority: 'high' | 'medium' | 'low'): WorkerRole[] => {
  return WORKER_ROLES.filter(role => role.safetyPriority === priority);
};