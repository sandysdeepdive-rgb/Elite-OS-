import { auth } from "@/lib/firebase/config";

async function callSMSAPI(
  type: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const token = await user.getIdToken();

    const res = await fetch("/api/sms", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ type, data }),
    });
    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

export const SMS = {
  feeReminder: (data: {
    parentName:  string;
    parentPhone: string;
    studentName: string;
    balance:     number;
    schoolName:  string;
  }) => callSMSAPI("fee_reminder", data),

  attendanceAlert: (data: {
    parentName:  string;
    parentPhone: string;
    studentName: string;
    status:      "absent" | "late";
    schoolName:  string;
  }) => callSMSAPI("attendance_alert", data),

  gradePosted: (data: {
    parentName:  string;
    parentPhone: string;
    studentName: string;
    subject:     string;
    score:       number;
    letterGrade: string;
    schoolName:  string;
  }) => callSMSAPI("grade_posted", data),

  announcement: (data: {
    phones:     string[];
    message:    string;
    schoolName: string;
  }) => callSMSAPI("announcement", data),

  accountApproved: (data: {
    phone:      string;
    schoolName: string;
  }) => callSMSAPI("account_approved", data),

  custom: (data: {
    phones:  string[];
    message: string;
  }) => callSMSAPI("custom", data),
};
