
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl } from "@/lib/pesapal";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference");

  if (!orderTrackingId || !merchantReference) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?error=missing_params`);
  }

  try {
    const token = await getPesapalToken();
    const res = await fetch(`${getPesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to query transaction status");
    }

    const statusData = await res.json();
    const paymentStatus = statusData.payment_status_description; // "Completed", "Failed", etc.

    // Extract schoolId and feeId
    const parts = merchantReference.split("-");
    const schoolId = parts[0];
    const feeId = parts[1];

    if (paymentStatus === "Completed") {
      // Update Firestore
      const feeRef = adminDb.collection("schools").doc(schoolId).collection("fees").doc(feeId);
      const feeSnap = await feeRef.get();

      if (feeSnap.exists) {
        const feeData = feeSnap.data()!;
        const paidAmount = Number(statusData.amount || 0);
        const newPaid = (feeData.amountPaid || 0) + paidAmount;
        const termFee = Number(feeData.termFee || 0);
        const newBalance = Math.max(0, termFee - newPaid);
        const newStatus = newBalance <= 0 ? "paid" : (newPaid > 0 ? "partial" : "unpaid");

        await feeRef.update({
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus,
          lastPayment: new Date().toLocaleDateString("en-UG", { day: "2-digit", month: "short" }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Update session
      await adminDb.collection("schools").doc(schoolId).collection("paymentSessions").doc(merchantReference).update({
        status: "completed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-success?ref=${merchantReference}`);
    } else {
      // Update session to failed
      await adminDb.collection("schools").doc(schoolId).collection("paymentSessions").doc(merchantReference).update({
        status: "failed",
        error: paymentStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?ref=${merchantReference}&status=${paymentStatus}`);
    }

  } catch (error: any) {
    console.error("Pesapal Callback Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?error=internal_error`);
  }
}
