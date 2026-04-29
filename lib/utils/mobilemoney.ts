import { v4 as uuidv4 } from "uuid";

// ── MTN MOMO ────────────────────────────────────────────

async function getMTNToken(): Promise<string> {
  const userId  = process.env.MTN_MOMO_USER_ID!;
  const apiKey  = process.env.MTN_MOMO_API_KEY!;
  const subKey  = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
  const baseUrl = process.env.MTN_MOMO_BASE_URL!;

  const credentials = Buffer.from(`${userId}:${apiKey}`)
    .toString("base64");

  const res = await fetch(
    `${baseUrl}/collection/token/`,
    {
      method: "POST",
      headers: {
        "Authorization":              `Basic ${credentials}`,
        "Ocp-Apim-Subscription-Key":  subKey,
      },
    }
  );

  const data = await res.json();
  return data.access_token;
}

export async function requestMTNPayment(params: {
  amount:        number;
  phone:         string;
  reference:     string;
  studentName:   string;
  schoolName:    string;
}): Promise<{
  success:     boolean;
  referenceId: string;
  error?:      string;
}> {
  try {
    const token    = await getMTNToken();
    const subKey   = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
    const baseUrl  = process.env.MTN_MOMO_BASE_URL!;
    const refId    = uuidv4();

    // Format phone — remove + for MTN API
    const phone = params.phone
      .replace(/[\s\-\(\)]/g, "")
      .replace(/^\+/, "");

    const res = await fetch(
      `${baseUrl}/collection/v1_0/requesttopay`,
      {
        method: "POST",
        headers: {
          "Authorization":             `Bearer ${token}`,
          "Content-Type":              "application/json",
          "X-Reference-Id":             refId,
          "X-Target-Environment":       "sandbox",
          "Ocp-Apim-Subscription-Key":  subKey,
        },
        body: JSON.stringify({
          amount:     String(params.amount),
          currency:   "UGX",
          externalId: params.reference,
          payer: {
            partyIdType: "MSISDN",
            partyId:      phone,
          },
          payerMessage:
            `School fees for ${params.studentName}`,
          payeeNote:
            `Payment to ${params.schoolName}`,
        }),
      }
    );

    if (res.status === 202) {
      return { success: true, referenceId: refId };
    }

    const err = await res.text();
    return {
      success:     false,
      referenceId: refId,
      error:       err,
    };
  } catch (err) {
    return {
      success:     false,
      referenceId: "",
      error:       String(err),
    };
  }
}

export async function checkMTNPaymentStatus(
  referenceId: string
): Promise<{
  status: "SUCCESSFUL" | "FAILED" | "PENDING";
  reason?: string;
}> {
  try {
    const token  = await getMTNToken();
    const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
    const baseUrl = process.env.MTN_MOMO_BASE_URL!;

    const res = await fetch(
      `${baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          "Authorization":             `Bearer ${token}`,
          "X-Target-Environment":       "sandbox",
          "Ocp-Apim-Subscription-Key":  subKey,
        },
      }
    );

    const data = await res.json();
    return {
      status: data.status || "PENDING",
      reason: data.reason,
    };
  } catch {
    return { status: "PENDING" };
  }
}

// ── AIRTEL MONEY ────────────────────────────────────────

async function getAirtelToken(): Promise<string> {
  const res = await fetch(
    `${process.env.AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     process.env.AIRTEL_CLIENT_ID,
        client_secret: process.env.AIRTEL_CLIENT_SECRET,
        grant_type:    "client_credentials",
      }),
    }
  );
  const data = await res.json();
  return data.access_token;
}

export async function requestAirtelPayment(params: {
  amount:      number;
  phone:       string;
  reference:   string;
  studentName: string;
}): Promise<{
  success:     boolean;
  referenceId: string;
  error?:      string;
}> {
  try {
    const token = await getAirtelToken();
    const refId = uuidv4();

    const phone = params.phone
      .replace(/[\s\-\(\)]/g, "")
      .replace(/^\+256/, "0");

    const res = await fetch(
      `${process.env.AIRTEL_BASE_URL}/merchant/v2/payments/`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type":  "application/json",
          "X-Country":     "UG",
          "X-Currency":    "UGX",
        },
        body: JSON.stringify({
          reference: refId,
          subscriber: {
            country: "UG",
            currency: "UGX",
            msisdn:   phone,
          },
          transaction: {
            amount:   params.amount,
            country:  "UG",
            currency: "UGX",
            id:       params.reference,
          },
        }),
      }
    );

    const data = await res.json();
    const success =
      data.status?.response_code === "DP00800001001";

    return {
      success,
      referenceId: refId,
      error: success ? undefined : data.status?.message,
    };
  } catch (err) {
    return {
      success:     false,
      referenceId: "",
      error:       String(err),
    };
  }
}
