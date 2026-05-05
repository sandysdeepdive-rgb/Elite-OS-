
import { NextRequest, NextResponse } from "next/server";
import { getPesapalToken, getPesapalBaseUrl, setIpnId } from "@/lib/pesapal";

export async function POST(req: NextRequest) {
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
    setIpnId(data.ipn_id);

    return NextResponse.json({ success: true, ipn_id: data.ipn_id });
  } catch (error: any) {
    console.error("Pesapal IPN Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
