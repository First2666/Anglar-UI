export type VetSpecialty =
  | 'General Practice'
  | 'Surgery'
  | 'Dermatology'
  | 'Dentistry'
  | 'Cardiology'
  | 'Oncology'
  | 'Other';

export type Vet = {
  id: string;
  fullName: string;
  specialty: VetSpecialty;
  phone?: string;
  email?: string;
  available: boolean;
  createdAt: string; // ISO
};
