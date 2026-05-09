const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "elite-is";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get a Firebase Auth token for REST API calls
// Uses the Firebase Auth REST API with API key
async function getAccessToken(): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase API key not configured");

  // For server-side calls we use a long-lived custom token approach
  // Use the API_SECRET as a server identity marker
  // Actually — for Firestore REST we use the Firebase Auth emulator token
  // OR we bypass auth using Firestore REST with API key directly
  // The correct approach: use Firebase Auth REST to sign in as a service user

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.FIREBASE_SERVICE_EMAIL,
        password: process.env.FIREBASE_SERVICE_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to authenticate service account");
  const data = await res.json();
  return data.idToken;
}

// Convert a plain JS object to Firestore REST format
export function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = { integerValue: value };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === "object") {
      fields[key] = { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
    }
  }
  return fields;
}

// Convert Firestore REST format back to plain JS object
export function fromFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    const f = field as Record<string, unknown>;
    if ("stringValue" in f) obj[key] = f.stringValue;
    else if ("integerValue" in f) obj[key] = Number(f.integerValue);
    else if ("doubleValue" in f) obj[key] = Number(f.doubleValue);
    else if ("booleanValue" in f) obj[key] = f.booleanValue;
    else if ("nullValue" in f) obj[key] = null;
    else if ("timestampValue" in f) obj[key] = f.timestampValue;
    else if ("mapValue" in f) {
      const mv = f.mapValue as { fields: Record<string, unknown> };
      obj[key] = fromFirestoreFields(mv.fields || {});
    }
  }
  return obj;
}

// GET a single document
export async function getDocument(path: string): Promise<Record<string, unknown> | null> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET failed: ${res.status}`);
  const data = await res.json();
  return fromFirestoreFields(data.fields || {});
}

// SET (create or overwrite) a document
export async function setDocument(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = await getAccessToken();
  const [collectionPath, docId] = splitPath(path);
  const res = await fetch(
    `${BASE_URL}/${collectionPath}?documentId=${docId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    }
  );
  if (!res.ok) {
    // Document exists — use PATCH instead
    await patchDocument(path, data);
  }
}

// PATCH (update) a document
export async function patchDocument(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = await getAccessToken();
  const updateMask = Object.keys(data)
    .map(k => `updateMask.fieldPaths=${k}`)
    .join("&");
  const res = await fetch(`${BASE_URL}/${path}?${updateMask}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore PATCH failed: ${res.status}`);
}

// QUERY a collection
export async function queryCollection(
  collectionPath: string,
  field: string,
  value: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionPath.split("/").pop() }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: "EQUAL",
              value: { stringValue: value },
            },
          },
          limit: 10,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Firestore query failed: ${res.status}`);
  const results = await res.json();
  return results
    .filter((r: { document?: unknown }) => r.document)
    .map((r: { document: { name: string; fields: Record<string, unknown> } }) => ({
      id: r.document.name.split("/").pop() || "",
      data: fromFirestoreFields(r.document.fields || {}),
    }));
}

function splitPath(path: string): [string, string] {
  const parts = path.split("/");
  const docId = parts.pop()!;
  return [parts.join("/"), docId];
}
