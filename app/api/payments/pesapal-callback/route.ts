
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl } from "@/lib/pesapal";
import { getDocument, setDocument, patchDocument } from "@/lib/firestore-rest";

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
    const parts = merchantReference.split("__");
    if (parts.length < 3) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?error=invalid_reference`);
    }
    const schoolId = parts[0];
    const feeId = parts[1];

    if (!schoolId || !feeId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?error=invalid_reference`);
    }

    // Check if this orderTrackingId was already processed
    const sessionPath = `schools/${schoolId}/paymentSessions/${merchantReference}`;
    const sessionData = await getDocument(sessionPath);

    if (sessionData && sessionData.status === "completed") {
      // Already processed — redirect to success without reprocessing
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?ref=${merchantReference}&duplicate=true`
      );
    }

    const now = new Date().toISOString();

    if (paymentStatus === "Completed") {
      // Update Firestore
      const feePath = `schools/${schoolId}/fees/${feeId}`;
      const feeData = await getDocument(feePath);

      if (feeData) {
        const paidAmount = Number(statusData.amount);
        if (!paidAmount || isNaN(paidAmount) || paidAmount <= 0) {
          throw new Error(`Invalid payment amount received: ${statusData.amount}`);
        }
        const newPaid = Number(feeData.amountPaid || 0) + paidAmount;
        const termFee = Number(feeData.termFee || 0);
        const newBalance = Math.max(0, termFee - newPaid);
        const newStatus = newBalance <= 0 ? "paid" : (newPaid > 0 ? "partial" : "unpaid");

        await patchDocument(feePath, {
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus,
          lastPaymentAt: now,
          updatedAt: now,
        });

        const txId = "tx-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
        await setDocument(`schools/${schoolId}/transactions/${txId}`, {
          orderTrackingId,
          merchantReference,
          feeId,
          studentId: feeData.studentId,
          studentName: feeData.studentName,
          amount: paidAmount,
          currency: "UGX",
          method: "Pesapal",
          status: "completed",
          processedAt: now,
        });
      }

      // Update session
      await patchDocument(sessionPath, {
        status: "completed",
        updatedAt: now,
      });

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-success?ref=${merchantReference}`);
    } else {
      // Update session to failed
      await patchDocument(sessionPath, {
        status: "failed",
        error: paymentStatus,
        updatedAt: now,
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?ref=${merchantReference}&status=${paymentStatus}`);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Pesapal Callback Error:", message);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/payment-failed?error=internal_error`);
  }
}
