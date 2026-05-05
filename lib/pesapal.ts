
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "";
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";
const PESAPAL_ENV = process.env.PESAPAL_ENV || "sandbox";

const BASE_URLS = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  live: "https://pay.pesapal.com/v3",
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let cachedIpnId: string | null = null;

export function getPesapalBaseUrl(): string {
  return PESAPAL_ENV === "live" ? BASE_URLS.live : BASE_URLS.sandbox;
}

export async function getPesapalToken(): Promise<string> {
  // Check if token is still valid (with 1 min buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const res = await fetch(`${getPesapalBaseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pesapal Auth Failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  // expiryDate is usually ISO string or similar, convert to timestamp
  tokenExpiry = new Date(data.expiryDate).getTime();
  
  return cachedToken!;
}

export function setIpnId(id: string) {
  cachedIpnId = id;
}

export function getIpnId(): string | null {
  return cachedIpnId;
}
