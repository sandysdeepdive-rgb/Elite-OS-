
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl, getIpnId } from "@/lib/pesapal";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { 
      schoolId, 
      feeId, 
      studentId, 
      studentName, 
      amount, 
      currency = "UGX", 
      email, 
      phone 
    } = await req.json();

    if (!schoolId || !feeId || !studentId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = await getPesapalToken();
    let ipnId = getIpnId();

    // If no IPN ID, try to register it (Step 2 logic inline or call it)
    if (!ipnId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const ipnRes = await fetch(`${getPesapalBaseUrl()}/api/URLSetup/RegisterIPN`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: `${appUrl}/api/payments/pesapal-callback`,
          ipn_notification_type: "POST",
        }),
      });
      if (ipnRes.ok) {
        const ipnData = await ipnRes.json();
        ipnId = ipnData.ipn_id;
      } else {
        throw new Error("Failed to register IPN for Pesapal");
      }
    }

    const merchantReference = `${schoolId}-${feeId}-${Date.now()}`;
    const nameParts = studentName.trim().split(" ");
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "Name";

    const payload = {
      id: merchantReference,
      currency: currency,
      amount: amount,
      description: `School fee payment for ${studentName}`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/pesapal-callback`,
      notification_id: ipnId,
      billing_address: {
        email_address: email,
        phone_number: phone || "",
        first_name: firstName,
        last_name: lastName,
      },
    };

    const res = await fetch(`${getPesapalBaseUrl()}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Pesapal Order Submission Failed: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    // data: { order_tracking_id, redirect_url, merchant_reference, error }

    // Write pending record to Firestore using adminDb (as used elsewhere in the app for reliability)
    await adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("paymentSessions")
      .doc(merchantReference)
      .set({
        feeId,
        studentId,
        studentName,
        amount,
        status: "pending",
        orderTrackingId: data.order_tracking_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Submit Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
