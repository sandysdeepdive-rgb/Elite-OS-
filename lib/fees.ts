import { serverTimestamp } from "firebase/firestore";

export interface FeeStructure {
  senior1_2: number;
  senior3_4: number;
  senior5_6: number;
}

export function getTermFee(studentClass: string, feeStructure: FeeStructure): number {
  // Extract number from class (e.g., "S.1A" -> 1, "P.7" -> 7, "Senior 4" -> 4)
  const levelMatch = studentClass.match(/\d+/);
  const level = levelMatch ? parseInt(levelMatch[0]) : 1;

  if (level <= 2) return feeStructure.senior1_2;
  if (level <= 4) return feeStructure.senior3_4;
  return feeStructure.senior5_6;
}

export interface FeeDocumentData {
  studentId: string;
  studentName: string;
  class: string;
  termFee: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  term: string;
  academicYear: string;
  createdAt: any;
}

export const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  senior1_2: 700000,
  senior3_4: 850000,
  senior5_6: 950000,
};
