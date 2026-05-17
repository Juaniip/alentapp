// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}

// ==========================================
// Payment
// ==========================================
export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled';
export interface PaymentDTO {
  id: string; // UUID
  amount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  due_date: string; // ISO Date String (YYYY-MM-DD)
  payment_date?: string; // ISO Date String
  member_id: string;
}
export interface CreatePaymentRequest {
  amount: number;
  month: number;
  year: number;
  due_date: string; // ISO Date String (YYYY-MM-DD)
  member_id: string;
}
export interface UpdatePaymentRequest {
  amount?: number;
  due_date?: string; // ISO Date String (YYYY-MM-DD)
  status?: PaymentStatus;
}

// ==========================================
// Locker
// ==========================================
export type LockerStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface LockerDTO {
  id: string;
  number: number;
  location: string;
  status: LockerStatus;
  member_id: string | null;
}

export interface CreateLockerRequest {
  number: number;
  location: string;
  status: 'Available' | 'Maintenance';
}

export interface UpdateLockerRequest {
  number?: number;
  location?: string;
  status?: LockerStatus;
  member_id?: string | null;
}

// ==========================================
// Sport
// ==========================================
export interface SportDTO {
  id: string;
  name: string;
  description: string;
  maxCapacity: number;
  additionalPrice: number;
  requiresMedicalCertificate: boolean;
}

export interface CreateSportRequest {
  name: string;
  description: string;
  maxCapacity: number;
  additionalPrice: number;
  requiresMedicalCertificate: boolean;
}

export interface UpdateSportRequest {
  description?: string;
  maxCapacity?: number;
  additionalPrice?: number;
  requiresMedicalCertificate?: boolean;
}

// ==========================================
// EquipmentLoan
// ==========================================
export type LoanStatus = 'Loaned' | 'Returned' | 'Damaged';

export interface EquipmentLoanDTO {
  id: string;
  itemName: string;
  status: LoanStatus;
  loanDate: string; // ISO 8601
  dueDate: string;  // ISO 8601
  memberId: string;
}

export interface CreateEquipmentLoanRequest {
  itemName: string;
  dueDate: string;  // ISO 8601. Debe ser posterior a NOW().
  memberId: string; // UUID del socio. Debe existir y ser Pleno o Honorario.
}

export interface UpdateEquipmentLoanRequest {
  itemName?: string;
  status?: 'Returned' | 'Damaged';
  dueDate?: string; // ISO 8601. Debe seguir siendo > loanDate original.
}