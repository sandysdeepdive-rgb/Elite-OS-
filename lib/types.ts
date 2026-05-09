export type UserRole = 'admin' | 'teacher' | 'parent';
export type UserStatus = 'approved' | 'pending' | 'rejected';
export type FeeStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentStatus = 'completed' | 'pending' | 'failed';

export interface FeeStructure {
  senior1_2: number;
  senior3_4: number;
  senior5_6: number;
}

export interface UserDocument {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  schoolId: string;
  schoolCode: string;
  linkedId: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDocument {
  id: string;
  name: string;
  class: string;
  parentContact: string;
  parentUid?: string;
  feesStatus: FeeStatus;
  attendance: string;
  createdAt: string;
}

export interface FeeDocument {
  studentId: string;
  studentName: string;
  class: string;
  termFee: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  term: string;
  academicYear: string;
  createdAt: string;
}
