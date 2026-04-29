import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
const API_USER         = process.env.MOMO_API_USER;
const API_KEY          = process.env.MOMO_API_KEY;
const ENVIRONMENT      = process.env.MOMO_TARGET_ENVIRONMENT || "sandbox";
const BASE_URL         = ENVIRONMENT === "sandbox" 
  ? "https://sandbox.momodeveloper.mtn.com" 
  : "https://proxy.momoapi.mtn.com";

// Simplified token fetcher
async function getAuthToken() {
  const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY!,
    },
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, phone, studentId, studentName, schoolId } = await req.json();

    if (!SUBSCRIPTION_KEY || !API_USER || !API_KEY) {
      return NextResponse.json({ error: "MoMo API keys not configured" }, { status: 500 });
    }

    const token = await getAuthToken();
    const referenceId = crypto.randomUUID();

    // Standardize phone number for MoMo (must be 256...)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "256" + cleanPhone.slice(1);
    if (!cleanPhone.startsWith("256")) cleanPhone = "256" + cleanPhone;

    const payload = {
      amount: String(amount),
      currency: "EUR", // Sandbox MoMo often requires EUR, production uses UGX
      externalId: studentId,
      payer: {
        partyIdType: "MSISDN",
        partyId: cleanPhone,
      },
      payerMessage: `Fee payment for ${studentName}`,
      payeeNote: `EliteSchool Fee - ${studentId}`,
    };

    const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": ENVIRONMENT,
        "X-Callback-Url": `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 202) {
      // Transaction initiated successfully
      // Save it to Firestore as pending
      await adminDb.collection("schools").doc(schoolId).collection("transactions").doc(referenceId).set({
        referenceId,
        amount: Number(amount),
        studentId,
        studentName,
        phone: cleanPhone,
        method: "MTN MoMo",
        status: "PENDING",
        type: "fee_payment",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, txnRef: referenceId });
    }

    const errorData = await res.text();
    return NextResponse.json({ error: "MoMo initiation failed", details: errorData }, { status: res.status });

  } catch (err) {
    console.error("MoMo Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
