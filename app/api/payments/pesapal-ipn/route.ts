
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl, setIpnId } from "@/lib/pesapal";

export async function POST(req: NextRequest) {
  const apiSecret = req.headers.get("x-api-secret");
  if (apiSecret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getPesapalToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const res = await fetch(`${getPesapalBaseUrl()}/api/URLSetup/RegisterIPN`, {
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

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `IPN registration failed: ${err}` }, { status: res.status });
    }

    const data = await res.json();

    if (!data.ipn_id || typeof data.ipn_id !== "string") {
      return NextResponse.json(
        { error: "Pesapal did not return a valid ipn_id" },
        { status: 500 }
      );
    }

    setIpnId(data.ipn_id);

    // Persist to Firestore so it survives serverless cold starts
    const { setDocument } = await import("@/lib/firestore-rest");
    await setDocument("config/pesapal", {
      ipn_id: data.ipn_id,
      registeredAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, ipn_id: data.ipn_id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Pesapal IPN Error:", message);
    return NextResponse.json({ error: "IPN registration failed. Please try again." }, { status: 500 });
  }
}
