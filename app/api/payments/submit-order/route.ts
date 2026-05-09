
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl, getOrLoadIpnId } from "@/lib/pesapal";
import { getDocument, setDocument } from "@/lib/firestore-rest";

export async function POST(req: NextRequest) {
  const apiSecret = req.headers.get("x-api-secret");
  if (apiSecret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      schoolId, 
      feeId, 
      studentId, 
      studentName, 
      email, 
      phone = ""
    } = await req.json();

    if (!schoolId || !feeId || !studentId || !studentName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!studentName.trim()) {
      return NextResponse.json({ error: "Student name is required" }, { status: 400 });
    }

    const feeData = await getDocument(`schools/${schoolId}/fees/${feeId}`);
    if (!feeData) {
      return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
    }

    const amount = feeData.amount;

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const token = await getPesapalToken();
    let ipnId = await getOrLoadIpnId();

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
        if (!ipnData.ipn_id || typeof ipnData.ipn_id !== "string") {
          throw new Error("Pesapal IPN re-registration returned invalid ipn_id");
        }
        ipnId = ipnData.ipn_id;
        // Import here to avoid circular dependency
        const { setIpnId } = await import("@/lib/pesapal");
        setIpnId(ipnId as string);
        // Persist to Firestore so it survives cold starts
        await setDocument("config/pesapal", {
          ipn_id: ipnId as string,
          registeredAt: new Date().toISOString(),
        });
      } else {
        throw new Error("Failed to register IPN for Pesapal");
      }
    }

    const merchantReference = `${schoolId}__${feeId}__${Date.now()}`;
    const nameParts = studentName.trim().split(" ");
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "Name";

    const payload = {
      id: merchantReference,
      currency: "UGX",
      amount: parsedAmount,
      description: `School fee payment for ${studentName}`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/pesapal-callback`,
      notification_id: ipnId as string,
      billing_address: {
        email_address: email,
        phone_number: phone,
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
      const errText = await res.text();
      console.error("Pesapal submission error:", errText);
      return NextResponse.json({ error: "Payment initiation failed. Please try again." }, { status: res.status });
    }

    const data = await res.json();

    await setDocument(`schools/${schoolId}/paymentSessions/${merchantReference}`, {
      feeId,
      studentId,
      studentName,
      amount: parsedAmount,
      status: "pending",
      orderTrackingId: data.order_tracking_id,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      redirect_url: data.redirect_url,
      order_tracking_id: data.order_tracking_id,
      merchant_reference: merchantReference
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Submit Order Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
