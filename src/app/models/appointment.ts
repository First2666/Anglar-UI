export type AppointmentStatus = 'Pending' | 'Scheduled' | 'CheckedIn' | 'InSession' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid';

export interface BillItem {
  id: string;
  name: string;
  price: number;
}

export type AppointmentReason = 
  | 'Annual Vaccination' 
  | 'Illness / Injury' 
  | 'General Checkup' 
  | 'Follow-up'
  | 'Dental'
  | 'Surgery'
  | 'Other';

export type Appointment = {
  id: string;
  petId: string;
  ownerId: string;
  vetId?: string;
  startAt: string; // ISO
  durationMinutes: number; // For scheduling
  reason: AppointmentReason;
  reasonDetails?: string; // Custom details
  status: AppointmentStatus;
  diagnosis?: string;
  notes?: string;
  
  // Billing fields
  billItems?: BillItem[];
  totalCost?: number;
  paymentStatus?: PaymentStatus;
  paidAt?: string; // ISO

  createdAt: string; // ISO
};

