import { User, Shift, ClockLog, Job, PushNotificationLog } from './types';

export const initialUsers: User[] = [
  {
    id: 'emp-1',
    name: 'Carlos Ramirez',
    username: 'Ramirez',
    email: 'carlos.r@vectortechnical.com',
    role: 'employee',
    pin: '0000',
    balanceDue: 0,
    phone: '+1 (555) 234-5678',
    position: 'Lead HVAC Technician',
    vehicleNumber: 'VEC-HVAC-01',
    avatarColor: 'bg-amber-400 text-black'
  },
  {
    id: 'emp-2',
    name: 'Kiara Jenkins',
    username: 'Jenkins',
    email: 'kiara.j@vectortechnical.com',
    role: 'employee',
    pin: '0000',
    balanceDue: 0,
    phone: '+1 (555) 345-6789',
    position: 'Senior Field Electrician',
    vehicleNumber: 'VEC-ELEC-04',
    avatarColor: 'bg-yellow-300 text-black'
  },
  {
    id: 'emp-3',
    name: 'Samir Patel',
    username: 'Patel',
    email: 'samir.p@vectortechnical.com',
    role: 'employee',
    pin: '0000',
    balanceDue: 0,
    phone: '+1 (555) 456-7890',
    position: 'General Supply & Logistics Coordinator',
    vehicleNumber: 'VEC-SUPP-09',
    avatarColor: 'bg-orange-400 text-black'
  },
  {
    id: 'emp-4',
    name: 'Ray Obiero',
    username: 'Obiero',
    email: 'rayobiero62@gmail.com',
    role: 'super-admin',
    pin: '51passvector',
    balanceDue: 0,
    phone: '+1 (555) 789-0123',
    position: 'CEO / Super Admin',
    vehicleNumber: 'VEC-MAIN-07',
    avatarColor: 'bg-amber-500 text-black'
  },
  {
    id: 'admin-1',
    name: 'Marcus Vector',
    username: 'Vector',
    email: 'marcus@vectortechnical.com',
    role: 'admin',
    pin: '0000',
    balanceDue: 0,
    phone: '+1 (555) 901-2345',
    position: 'Technical & Roster Director',
    avatarColor: 'bg-neutral-800 text-amber-400 border border-amber-400'
  },
  {
    id: 'admin-2',
    name: 'Sarah Head',
    username: 'Head',
    email: 'sarah.procurement@vectortechnical.com',
    role: 'admin',
    pin: '0000',
    balanceDue: 0,
    phone: '+1 (555) 888-2345',
    position: 'Head of Procurement',
    avatarColor: 'bg-rose-500 text-white'
  }
];

// Today is June 13, 2026. Let's seed shifts for the week of June 8 to June 14, 2026
export const initialShifts: Shift[] = [
  // Monday June 8
  { id: 's-1', userId: 'emp-1', date: '2026-06-08', startTime: '08:00', endTime: '16:30', type: 'normal', notes: 'HVAC Scheduled maintenance' },
  { id: 's-2', userId: 'emp-2', date: '2026-06-08', startTime: '08:00', endTime: '16:30', type: 'normal', notes: 'Commercial rewiring at Site B' },
  { id: 's-3', userId: 'emp-3', date: '2026-06-08', startTime: '07:30', endTime: '16:00', type: 'normal', notes: 'Warehouse supply sorting' },
  { id: 's-4', userId: 'emp-4', date: '2026-06-08', startTime: '08:30', endTime: '17:00', type: 'normal', notes: 'Turbine recalibration' },

  // Tuesday June 9
  { id: 's-5', userId: 'emp-1', date: '2026-06-09', startTime: '08:00', endTime: '16:30', type: 'normal', notes: 'HVAC Scheduled maintenance' },
  { id: 's-6', userId: 'emp-2', date: '2026-06-09', startTime: '08:00', endTime: '16:30', type: 'normal', notes: 'Electrical installations' },
  { id: 's-7', userId: 'emp-3', date: '2026-06-09', startTime: '07:30', endTime: '16:00', type: 'normal', notes: 'Client parts delivery' },
  { id: 's-8', userId: 'emp-4', date: '2026-06-09', startTime: '08:30', endTime: '17:00', type: 'normal', notes: 'Preventative diagnostics' },

  // Wednesday June 10
  { id: 's-9', userId: 'emp-1', date: '2026-06-10', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-10', userId: 'emp-2', date: '2026-06-10', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-11', userId: 'emp-3', date: '2026-06-10', startTime: '07:30', endTime: '16:00', type: 'normal' },
  { id: 's-12', userId: 'emp-4', date: '2026-06-10', startTime: '12:00', endTime: '20:30', type: 'night', notes: 'Emergency stand-by' },

  // Thursday June 11
  { id: 's-13', userId: 'emp-1', date: '2026-06-11', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-14', userId: 'emp-2', date: '2026-06-11', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-15', userId: 'emp-3', date: '2026-06-11', startTime: '07:30', endTime: '16:00', type: 'normal' },
  { id: 's-16', userId: 'emp-4', date: '2026-06-11', startTime: '08:30', endTime: '17:00', type: 'normal' },

  // Friday June 12
  { id: 's-17', userId: 'emp-1', date: '2026-06-12', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-18', userId: 'emp-2', date: '2026-06-12', startTime: '08:00', endTime: '16:30', type: 'normal' },
  { id: 's-19', userId: 'emp-3', date: '2026-06-12', startTime: '07:30', endTime: '16:00', type: 'normal' },
  { id: 's-20', userId: 'emp-4', date: '2026-06-12', startTime: '08:30', endTime: '17:00', type: 'normal' },

  // Saturday June 13 (Today)
  { id: 's-21', userId: 'emp-1', date: '2026-06-13', startTime: '09:00', endTime: '14:00', type: 'on-call', notes: 'On-Call Maintenance' },
  { id: 's-22', userId: 'emp-4', date: '2026-06-13', startTime: '09:00', endTime: '17:00', type: 'normal', notes: 'General mechanical overhaul' },
  { id: 's-23', userId: 'emp-2', date: '2026-06-13', startTime: '10:00', endTime: '15:00', type: 'normal', notes: 'Supply delivery inspections' }
];

// Clock logs for the week of June 8 to June 12, 2026.
// Let's create realistic times, some overtime, some normal time.
export const initialClockLogs: ClockLog[] = [
  // Monday June 8
  {
    id: 'l-1',
    userId: 'emp-1',
    userName: 'Carlos Ramirez',
    clockInTime: '2026-06-08T07:55:00Z',
    clockOutTime: '2026-06-08T16:35:00Z',
    totalHours: 8.67,
    overtimeHours: 0.67,
    calculatedPay: (8 * 35) + (0.67 * 35 * 1.5), // Normal rate + 1.5x Overtime after 8 hours
    verified: true,
    notes: 'HVAC Depot inspection completed'
  },
  {
    id: 'l-2',
    userId: 'emp-2',
    userName: 'Kiara Jenkins',
    clockInTime: '2026-06-08T08:02:00Z',
    clockOutTime: '2026-06-08T16:30:00Z',
    totalHours: 8.47,
    overtimeHours: 0.47,
    calculatedPay: (8 * 34) + (0.47 * 34 * 1.5),
    verified: true
  },
  {
    id: 'l-3',
    userId: 'emp-3',
    userName: 'Samir Patel',
    clockInTime: '2026-06-08T07:28:00Z',
    clockOutTime: '2026-06-08T16:05:00Z',
    totalHours: 8.62,
    overtimeHours: 0.62,
    calculatedPay: (8 * 28) + (0.62 * 28 * 1.5),
    verified: true
  },
  {
    id: 'l-4',
    userId: 'emp-4',
    userName: 'Ray Obiero',
    clockInTime: '2026-06-08T08:25:00Z',
    clockOutTime: '2026-06-08T17:02:00Z',
    totalHours: 8.62,
    overtimeHours: 0.62,
    calculatedPay: (8 * 32) + (0.62 * 32 * 1.5),
    verified: true
  },

  // Tuesday June 9
  {
    id: 'l-5',
    userId: 'emp-1',
    userName: 'Carlos Ramirez',
    clockInTime: '2026-06-09T08:00:00Z',
    clockOutTime: '2026-06-09T17:30:00Z', // 9.5 Hours (1.5h Overtime)
    totalHours: 9.5,
    overtimeHours: 1.5,
    calculatedPay: (8 * 35) + (1.5 * 35 * 1.5),
    verified: true,
    notes: 'Urgent leak diagnostics at North Tower'
  },
  {
    id: 'l-6',
    userId: 'emp-2',
    userName: 'Kiara Jenkins',
    clockInTime: '2026-06-09T07:58:00Z',
    clockOutTime: '2026-06-09T16:32:00Z',
    totalHours: 8.57,
    overtimeHours: 0.57,
    calculatedPay: (8 * 34) + (0.57 * 34 * 1.5),
    verified: true
  },
  {
    id: 'l-7',
    userId: 'emp-3',
    userName: 'Samir Patel',
    clockInTime: '2026-06-09T07:31:00Z',
    clockOutTime: '2026-06-09T16:02:00Z',
    totalHours: 8.52,
    overtimeHours: 0.52,
    calculatedPay: (8 * 28) + (0.52 * 28 * 1.5),
    verified: true
  },
  {
    id: 'l-8',
    userId: 'emp-4',
    userName: 'Ray Obiero',
    clockInTime: '2026-06-09T08:30:00Z',
    clockOutTime: '2026-06-09T17:05:00Z',
    totalHours: 8.58,
    overtimeHours: 0.58,
    calculatedPay: (8 * 32) + (0.58 * 32 * 1.5),
    verified: true
  },

  // Wednesday June 10
  {
    id: 'l-9',
    userId: 'emp-1',
    userName: 'Carlos Ramirez',
    clockInTime: '2026-06-10T07:50:00Z',
    clockOutTime: '2026-06-10T16:30:00Z',
    totalHours: 8.67,
    overtimeHours: 0.67,
    calculatedPay: (8 * 35) + (0.67 * 35 * 1.5),
    verified: true
  },
  {
    id: 'l-10',
    userId: 'emp-2',
    userName: 'Kiara Jenkins',
    clockInTime: '2026-06-10T08:00:00Z',
    clockOutTime: '2026-06-10T16:29:00Z',
    totalHours: 8.48,
    overtimeHours: 0.48,
    calculatedPay: (8 * 34) + (0.48 * 34 * 1.5),
    verified: true
  },
  {
    id: 'l-11',
    userId: 'emp-3',
    userName: 'Samir Patel',
    clockInTime: '2026-06-10T07:22:00Z',
    clockOutTime: '2026-06-10T16:45:00Z', // Big logistics day
    totalHours: 9.38,
    overtimeHours: 1.38,
    calculatedPay: (8 * 28) + (1.38 * 28 * 1.5),
    verified: true
  },
  {
    id: 'l-12',
    userId: 'emp-4',
    userName: 'Ray Obiero',
    clockInTime: '2026-06-10T11:45:00Z',
    clockOutTime: '2026-06-10T20:45:00Z',
    totalHours: 9.0,
    overtimeHours: 1.0,
    calculatedPay: (8 * 32) + (1.0 * 32 * 1.5),
    verified: true,
    notes: 'Emergency night boiler diagnostics'
  },

  // Thursday June 11
  {
    id: 'l-13',
    userId: 'emp-1',
    userName: 'Carlos Ramirez',
    clockInTime: '2026-06-11T08:05:00Z',
    clockOutTime: '2026-06-11T16:33:00Z',
    totalHours: 8.47,
    overtimeHours: 0.47,
    calculatedPay: (8 * 35) + (0.47 * 35 * 1.5),
    verified: true
  },
  {
    id: 'l-14',
    userId: 'emp-2',
    userName: 'Kiara Jenkins',
    clockInTime: '2026-06-11T08:01:00Z',
    clockOutTime: '2026-06-11T19:00:00Z', // Major rewire day (11 hours!)
    totalHours: 10.98,
    overtimeHours: 2.98,
    calculatedPay: (8 * 34) + (2.98 * 34 * 1.5),
    verified: true,
    notes: 'Primary transformer installation'
  },
  {
    id: 'l-15',
    userId: 'emp-3',
    userName: 'Samir Patel',
    clockInTime: '2026-06-11T07:35:00Z',
    clockOutTime: '2026-06-11T16:02:00Z',
    totalHours: 8.45,
    overtimeHours: 0.45,
    calculatedPay: (8 * 28) + (0.45 * 28 * 1.5),
    verified: true
  },
  {
    id: 'l-16',
    userId: 'emp-4',
    userName: 'Ray Obiero',
    clockInTime: '2026-06-11T08:24:00Z',
    clockOutTime: '2026-06-11T17:05:00Z',
    totalHours: 8.68,
    overtimeHours: 0.68,
    calculatedPay: (8 * 32) + (0.68 * 32 * 1.5),
    verified: true
  },

  // Friday June 12
  {
    id: 'l-17',
    userId: 'emp-1',
    userName: 'Carlos Ramirez',
    clockInTime: '2026-06-12T07:58:00Z',
    clockOutTime: '2026-06-12T16:35:00Z',
    totalHours: 8.62,
    overtimeHours: 0.62,
    calculatedPay: (8 * 35) + (0.62 * 35 * 1.5),
    verified: true
  },
  {
    id: 'l-18',
    userId: 'emp-2',
    userName: 'Kiara Jenkins',
    clockInTime: '2026-06-12T07:55:00Z',
    clockOutTime: '2026-06-12T16:31:00Z',
    totalHours: 8.60,
    overtimeHours: 0.60,
    calculatedPay: (8 * 34) + (0.60 * 34 * 1.5),
    verified: true
  },
  {
    id: 'l-19',
    userId: 'emp-3',
    userName: 'Samir Patel',
    clockInTime: '2026-06-12T07:29:00Z',
    clockOutTime: '2026-06-12T16:10:00Z',
    totalHours: 8.68,
    overtimeHours: 0.68,
    calculatedPay: (8 * 28) + (0.68 * 28 * 1.5),
    verified: true
  },
  {
    id: 'l-20',
    userId: 'emp-4',
    userName: 'Ray Obiero',
    clockInTime: '2026-06-12T08:29:00Z',
    clockOutTime: '2026-06-12T17:01:00Z',
    totalHours: 8.53,
    overtimeHours: 0.53,
    calculatedPay: (8 * 32) + (0.53 * 32 * 1.5),
    verified: true
  }
];

// Active and historical maintenance / supply jobs
export const initialJobs: Job[] = [
  {
    id: 'job-1',
    title: 'HVAC Air Handler Unit Overhaul',
    description: 'Perform a complete belt replacement, coil steam cleaning, and bearing lubrication on HVAC AHU #3 at Sutter Medical Tower.',
    category: 'urgent',
    assignedUserId: 'emp-1',
    assignedUserName: 'Carlos Ramirez',
    locationName: 'Sutter Medical Tower, Floor 4 Mezzanine',
    status: 'in-progress',
    priority: 'high',
    startedAt: '2026-06-13T09:15:00Z',
    completedAt: null,
    payoutAmount: 180,
    loggedMaterials: ['AHU Ribbed Belt size XL', 'Cobalt-9 Synthetic Grease', 'Microfiber Filter Core'],
    signature: null,
    statusHistory: [
      { status: 'pending', timestamp: '2026-06-13T08:00:00Z' },
      { status: 'on-site', timestamp: '2026-06-13T09:00:00Z' },
      { status: 'in-progress', timestamp: '2026-06-13T09:15:00Z' }
    ]
  },
  {
    id: 'job-2',
    title: 'Data Center Primary PDU Installation',
    description: 'Position and secure the newly supplied heavy-duty Power Distribution Unit (PDU) inside Server Rack G-12. Terminate main lines.',
    category: 'maintenance',
    assignedUserId: 'emp-2',
    assignedUserName: 'Kiara Jenkins',
    locationName: 'Mission Bay Data Center, Room B',
    status: 'pending',
    priority: 'medium',
    startedAt: null,
    completedAt: null,
    payoutAmount: 220,
    loggedMaterials: [],
    signature: null,
    statusHistory: [
      { status: 'pending', timestamp: '2026-06-13T08:15:00Z' }
    ]
  },
  {
    id: 'job-3',
    title: 'Hydraulic Seals Delivery & Commissioning',
    description: 'Bulk supply transport of 15x structural silicone hydraulic gaskets to Bay Shore Steam Plant. Validate pressure ratings with operators on delivery.',
    category: 'general-supply',
    assignedUserId: 'emp-3',
    assignedUserName: 'Samir Patel',
    locationName: 'Bay Shore Steam Plant, Warehouse Dock 2',
    status: 'completed',
    priority: 'medium',
    startedAt: '2026-06-13T08:30:00Z',
    completedAt: '2026-06-13T11:45:00Z',
    payoutAmount: 90,
    loggedMaterials: ['15x Silicon Hydraulic Gaskets (Model B)', 'Proof of Delivery Invoice #8892'],
    signature: 'S. Patel / Operator Jenkins',
    statusHistory: [
      { status: 'pending', timestamp: '2026-06-13T08:00:00Z' },
      { status: 'on-site', timestamp: '2026-06-13T08:30:00Z' },
      { status: 'in-progress', timestamp: '2026-06-13T09:00:00Z' },
      { status: 'completed', timestamp: '2026-06-13T11:45:00Z' }
    ]
  },
  {
    id: 'job-4',
    title: 'Electro-Mechanical Actuator Calibration',
    description: 'Calibrate precision control valve actuators in the central pumping room. Perform pressure differential test cycles.',
    category: 'maintenance',
    assignedUserId: 'emp-4',
    assignedUserName: 'Ray Obiero',
    locationName: 'Sutter Tech Complex, Central Pump Station',
    status: 'pending',
    priority: 'high',
    startedAt: null,
    completedAt: null,
    payoutAmount: 150,
    loggedMaterials: [],
    signature: null,
    statusHistory: [
      { status: 'pending', timestamp: '2026-06-13T08:45:00Z' }
    ]
  },
  {
    id: 'job-5',
    title: 'Emergency Generator Interlock Inspection',
    description: 'Safety check emergency bypass transfer switches. Test load response switchgear and clean switch connectors.',
    category: 'urgent',
    assignedUserId: 'emp-4',
    assignedUserName: 'Ray Obiero',
    locationName: 'San Francisco General Clinic, Emergency Annex',
    status: 'in-progress',
    priority: 'high',
    startedAt: '2026-06-13T11:00:00Z',
    completedAt: null,
    payoutAmount: 210,
    loggedMaterials: ['Contact Cleaner Aerosol spray', 'Copper terminal washers (M12)'],
    signature: null,
    statusHistory: [
      { status: 'pending', timestamp: '2026-06-13T09:30:00Z' },
      { status: 'on-site', timestamp: '2026-06-13T10:45:00Z' },
      { status: 'in-progress', timestamp: '2026-06-13T11:00:00Z' }
    ]
  }
];

export const initialNotifications: PushNotificationLog[] = [
  {
    id: 'n-1',
    title: 'Welcome to Vector Support',
    message: 'Greetings Vector Field Team. Check your daily rota schedules and assigned tasks. Ensure GPS tracking toggle is enabled on-site for automated verification reporting.',
    timestamp: '2026-06-13T07:30:00Z',
    recipientUserId: 'all',
    recipientUserName: 'All Team Members',
    isSent: true,
    type: 'system'
  },
  {
    id: 'n-2',
    title: 'Payroll Pending Audit Approval',
    message: 'Weekly timesheets for period ending June 12 have been calculated and are awaiting director verification inside the administrative ledger.',
    timestamp: '2026-06-13T08:00:00Z',
    recipientUserId: 'all',
    recipientUserName: 'All Team Members',
    isSent: true,
    type: 'payroll'
  },
  {
    id: 'n-3',
    title: 'Urgent HVAC Dispatch Alert',
    message: 'High-temperature alarm triggered at Sutter Medical Tower. Job assigned to Lead Tech Carlos Ramirez. Please acknowledge.',
    timestamp: '2026-06-13T08:05:00Z',
    recipientUserId: 'emp-1',
    recipientUserName: 'Carlos Ramirez',
    isSent: true,
    type: 'job'
  }
];
