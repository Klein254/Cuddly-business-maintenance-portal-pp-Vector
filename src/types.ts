export type UserRole = 'employee' | 'admin' | 'super-admin' | 'head-procurement' | 'finance';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  pin: string; // Used as password
  balanceDue: number;
  phone: string;
  position: string;
  vehicleNumber?: string;
  avatarColor: string;
  themePreference?: 'dark' | 'high-contrast';
  lastReadNotificationsAt?: string;
  lastReadMessagesAt?: Record<string, string>;
  isOnline?: boolean;
  lastActiveUpdatedAt?: string;
}

export interface Shift {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: 'normal' | 'on-call' | 'night' | 'off';
  notes?: string;
}

export interface ClockLog {
  id: string;
  userId: string;
  userName: string;
  clockInTime: string; // ISO string
  clockOutTime: string | null; // ISO string
  totalHours: number | null;
  overtimeHours: number | null;
  calculatedPay: number | null;
  verified: boolean;
  notes?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  category: 'maintenance' | 'general-supply' | 'urgent';
  assignedUserId: string;
  assignedUserName: string;
  locationName: string;
  status: 'pending' | 'on-site' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startedAt: string | null; // ISO
  completedAt: string | null; // ISO
  loggedMaterials: string[];
  signature: string | null; // base64 or drawn name
  statusHistory: { status: string; timestamp: string }[];
  payoutAmount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string; // 'general' or user id
  content: string;
  timestamp: string; // ISO
}

export interface PushNotificationLog {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO
  recipientUserId: string | 'all';
  recipientUserName: string;
  isSent: boolean;
  type: 'alert' | 'system' | 'job' | 'payroll';
}
