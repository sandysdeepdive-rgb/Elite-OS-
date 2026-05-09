import { NextRequest, NextResponse } from "next/server";

const AT_API_KEY  = process.env.AT_API_KEY!;
const AT_USERNAME = process.env.AT_USERNAME!;
const AT_SENDER   = process.env.AT_SENDER_ID || "EliteSchool";
const AT_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://api.africastalking.com/version1/messaging"
  : "https://api.sandbox.africastalking.com/version1/messaging";

import { getDocument } from "@/lib/firestore-rest";

// Verify User and Role
async function verifyUserAndRole(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split(" ")[1];
    
    // Verify token using Firebase Auth REST API
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    
    if (!authRes.ok) return null;
    const authData = await authRes.json();
    if (!authData.users || authData.users.length === 0) return null;
    
    const uid = authData.users[0].localId;

    // Check role in Firestore using REST API
    const profile = await getDocument(`users/${uid}`);
    if (!profile) return null;

    const status = (profile?.status as string)?.toLowerCase().trim();
    if (status !== "approved") return null;

    return { uid, role: profile?.role as string, schoolId: profile?.schoolId as string };
  } catch (error) {
    console.error("Auth verification failed:", error);
    return null;
  }
}

// Format Uganda phone number to international format
function formatUgandaPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+256")) return cleaned;
  if (cleaned.startsWith("256")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+256${cleaned.slice(1)}`;
  return `+256${cleaned}`;
}

async function sendSMS(
  to: string | string[],
  message: string
): Promise<{ success: boolean; error?: string }> {
  const recipients = Array.isArray(to)
    ? to.map(formatUgandaPhone).join(",")
    : formatUgandaPhone(to);

  const body = new URLSearchParams({
    username: AT_USERNAME,
    to:       recipients,
    message:  message.slice(0, 160), // SMS limit
    from:     AT_SENDER,
  });

  const res = await fetch(AT_BASE_URL, {
    method: "POST",
    headers: {
      "Accept":       "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "apiKey":        AT_API_KEY,
    },
    body: body.toString(),
  });

  const data = await res.json();

  if (process.env.NODE_ENV === "development") {
    console.log("SMS response:", data);
  }

  const recipients_result =
    data.SMSMessageData?.Recipients || [];
  const allSent = recipients_result.every(
    (r: { status: string }) => r.status === "Success"
  );

  return {
    success: allSent || recipients_result.length > 0,
    error: allSent ? undefined : data.SMSMessageData?.Message,
  };
}

export async function POST(req: NextRequest) {
  const user = await verifyUserAndRole(req);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" }, { status: 401 }
    );
  }

  // Only Admin or Teacher can send SMS
  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json(
      { error: "Forbidden: Insufficient permissions" }, { status: 403 }
    );
  }

  try {
    const { type, data } = await req.json();

    let result;

    switch (type) {

      // Fee reminder
      case "fee_reminder": {
        const msg =
          `Dear ${data.parentName}, this is a reminder that ` +
          `${data.studentName}'s school fees of UGX ` +
          `${data.balance?.toLocaleString()} are due. ` +
          `Please pay via MTN MoMo or Airtel Money. ` +
          `- ${data.schoolName}`;
        result = await sendSMS(data.parentPhone, msg);
        break;
      }

      // Attendance alert
      case "attendance_alert": {
        const statusText =
          data.status === "absent" ? "absent from" :
          data.status === "late"   ? "late for"    : "present at";
        const msg =
          `Dear ${data.parentName}, ${data.studentName} was ` +
          `marked ${statusText} school on ` +
          `${new Date().toLocaleDateString("en-UG", {
            weekday:"short", day:"2-digit", month:"short"
          })}. ` +
          `For queries call the school. - ${data.schoolName}`;
        result = await sendSMS(data.parentPhone, msg);
        break;
      }

      // Grade posted
      case "grade_posted": {
        const msg =
          `Dear ${data.parentName}, a new grade has been ` +
          `posted for ${data.studentName}: ` +
          `${data.subject} - ${data.score}/100 ` +
          `(${data.letterGrade}). ` +
          `Log in to EliteSchool OS for details. ` +
          `- ${data.schoolName}`;
        result = await sendSMS(data.parentPhone, msg);
        break;
      }

      // General announcement
      case "announcement": {
        const msg =
          `${data.schoolName}: ${data.message}`.slice(0, 160);
        result = await sendSMS(data.phones, msg);
        break;
      }

      // Account approved
      case "account_approved": {
        const msg =
          `Welcome to ${data.schoolName}! Your EliteSchool OS ` +
          `account has been approved. You can now log in at ` +
          `${process.env.NEXT_PUBLIC_APP_URL}. - Admin`;
        result = await sendSMS(data.phone, msg);
        break;
      }

      // Custom SMS
      case "custom": {
        result = await sendSMS(data.phones, data.message);
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unknown SMS type" }, { status: 400 }
        );
    }

    return NextResponse.json({ success: result.success });

  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("SMS error:", err);
    }
    return NextResponse.json(
      { error: "SMS service failed" }, { status: 500 }
    );
  }
}
