import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

const CLIENT_ID     = process.env.AIRTEL_CLIENT_ID;
const CLIENT_SECRET = process.env.AIRTEL_CLIENT_SECRET;
const ENVIRONMENT   = process.env.AIRTEL_TARGET_ENVIRONMENT || "sandbox";
const BASE_URL      = ENVIRONMENT === "sandbox"
  ? "https://openapi-sandbox.airtel.africa"
  : "https://openapi.airtel.africa";

async function getAuthToken() {
  const res = await fetch(`${BASE_URL}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, phone, studentId, studentName, schoolId } = await req.json();

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: "Airtel API keys not configured" }, { status: 500 });
    }

    const token = await getAuthToken();
    const referenceId = crypto.randomUUID().split("-")[0].toUpperCase() + Date.now().toString().slice(-6);

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.startsWith("256")) cleanPhone = cleanPhone.slice(3);

    const payload = {
      payer: {
        msisdn: cleanPhone,
      },
      transaction: {
        amount: Number(amount),
        id: referenceId,
        currency: "UGX",
      },
      additional_info: [
        { key: "studentId", value: studentId },
        { key: "studentName", value: studentName },
      ],
    };

    const res = await fetch(`${BASE_URL}/standard/v1/payments/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Country": "UG",
        "X-Currency": "UGX",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok && result.status?.success) {
      await adminDb.collection("schools").doc(schoolId).collection("transactions").doc(referenceId).set({
        referenceId,
        amount: Number(amount),
        studentId,
        studentName,
        phone: "256" + cleanPhone,
        method: "Airtel Money",
        status: "PENDING",
        type: "fee_payment",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, txnRef: referenceId });
    }

    return NextResponse.json({ error: "Airtel initiation failed", details: result }, { status: res.status });

  } catch (err) {
    console.error("Airtel Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
