import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-api-secret");
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" }, { status: 401 }
    );
  }

  const referenceId = uuidv4();
  const baseUrl = process.env.MTN_MOMO_BASE_URL!;
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;

  // Step 1 — Create API User
  await fetch(`${baseUrl}/v1_0/apiuser`, {
    method: "POST",
    headers: {
      "Content-Type":        "application/json",
      "X-Reference-Id":       referenceId,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
    body: JSON.stringify({
      providerCallbackHost: process.env.MTN_MOMO_CALLBACK_URL,
    }),
  });

  // Step 2 — Create API Key
  const keyRes = await fetch(
    `${baseUrl}/v1_0/apiuser/${referenceId}/apikey`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    }
  );
  const keyData = await keyRes.json();

  return NextResponse.json({
    userId:  referenceId,
    apiKey:  keyData.apiKey,
    message: "Save these to your .env.local as MTN_MOMO_USER_ID and MTN_MOMO_API_KEY",
  });
}
