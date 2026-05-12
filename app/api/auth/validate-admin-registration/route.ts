import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Verify API secret
  const secret = req.headers.get("x-api-secret");
  if (!secret || secret !== process.env.API_SECRET) {
    return NextResponse.json(
      { valid: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { schoolCode } = await req.json();

    if (!schoolCode || typeof schoolCode !== "string") {
      return NextResponse.json(
        { valid: false, error: "School code is required" },
        { status: 400 }
      );
    }

    const cleanCode = schoolCode.trim().toUpperCase();

    // Check if school code already exists using Firestore REST API
    // This is a GET request — much more reliable than POST writes
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "elite-is";
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}` +
      `/databases/(default)/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "schools" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "schoolCode" },
            op: "EQUAL",
            value: { stringValue: cleanCode },
          },
        },
        limit: 1,
      },
    };

    const firestoreRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody),
    });

    if (!firestoreRes.ok) {
      // If Firestore is unreachable, allow the client to proceed
      // The client-side batch write will fail atomically if there is a conflict
      console.warn(
        "[validate-admin-registration] Firestore check failed:",
        firestoreRes.status
      );
      return NextResponse.json({ valid: true });
    }

    const results = await firestoreRes.json();

    // Results is an array — if first element has a document, code is taken
    const isTaken =
      Array.isArray(results) &&
      results.length > 0 &&
      results[0].document != null;

    if (isTaken) {
      return NextResponse.json(
        { valid: false, error: "This school code is already in use." },
        { status: 409 }
      );
    }

    return NextResponse.json({ valid: true });

  } catch (err) {
    console.error("[validate-admin-registration] Error:", err);
    // Fail open — let client proceed; batch write is atomic anyway
    return NextResponse.json({ valid: true });
  }
}
