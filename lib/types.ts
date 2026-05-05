export type UserRole = "admin" | "teacher" | "parent";
export type UserStatus = "approved" | "pending" | "rejected";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string;
  schoolCode: string;
  status: UserStatus;
  linkedId: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}
