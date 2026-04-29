import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

/**
 * Combined Webhook for MoMo and Airtel
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (process.env.NODE_ENV === "development") {
      console.log("Payment Webhook received:", JSON.stringify(data, null, 2));
    }

    let referenceId = "";
    let status = "PENDING";
    let method = "Unknown";
    let amount = 0;

    // Detect MoMo Webhook (Ericsson Wallet Platform format)
    if (data.financialTransactionId || data.externalId) {
      referenceId = data.externalId || ""; // MTN MoMo uses externalId for our ref usually
      status = data.status === "SUCCESSFUL" ? "SUCCESS" : (data.status === "FAILED" ? "FAILED" : "PENDING");
      method = "MTN MoMo";
      amount = Number(data.amount);
    } 
    // Detect Airtel Webhook
    else if (data.transaction && data.transaction.id) {
      referenceId = data.transaction.id;
      status = data.transaction.status === "Success" ? "SUCCESS" : "FAILED";
      method = "Airtel Money";
      amount = Number(data.transaction.amount);
    }

    if (!referenceId) return NextResponse.json({ message: "No ref found" }, { status: 400 });

    // Update Transaction in Firestore
    const transactionsQuery = await adminDb.collectionGroup("transactions")
      .where("referenceId", "==", referenceId)
      .limit(1)
      .get();

    if (transactionsQuery.empty) {
      console.error(`Transaction ${referenceId} not found in Firestore`);
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    const txnDoc = transactionsQuery.docs[0];
    const txnData = txnDoc.data();

    // Security: Only allow updating if status is PENDING or if we are going from PENDING to SUCCESS
    if (txnData.status !== "PENDING") {
      return NextResponse.json({ message: "Transaction already processed" }, { status: 200 });
    }

    const schoolId = txnDoc.ref.parent.parent?.id;

    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 });

    await txnDoc.ref.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If successful, update the fee record balance
    if (status === "SUCCESS") {
      const { studentId, amount: paidAmount } = txnData;
      
      const feesQuery = await adminDb.collection("schools").doc(schoolId)
        .collection("fees")
        .where("studentId", "==", studentId)
        .limit(1)
        .get();

      if (!feesQuery.empty) {
        const feeDoc = feesQuery.docs[0];
        const feeData = feeDoc.data();
        const newPaid = (feeData.amountPaid || 0) + paidAmount;
        const newBalance = Math.max(0, (feeData.termFee || 0) - newPaid);
        const newStatus = newBalance <= 0 ? "paid" : (newPaid > 0 ? "partial" : "unpaid");

        await feeDoc.ref.update({
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus,
          lastPayment: new Date().toLocaleDateString("en-UG", { day: "2-digit", month: "short" }),
          lastPaymentPhone: txnData.phone,
          paymentMethod: method,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ status: "OK" });

  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
