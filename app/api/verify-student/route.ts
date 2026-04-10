import { NextRequest, NextResponse } from "next/server";

// Rate limiting store
const rateLimitMap = new Map<string, {
  count: number; timestamp: number
}>();

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting by IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const limit = rateLimitMap.get(ip);

    if (limit) {
      if (now - limit.timestamp < 15 * 60 * 1000) {
        if (limit.count >= 10) {
          return NextResponse.json(
            { valid: false, error: "rate_limited" },
            { status: 429 }
          );
        }
        rateLimitMap.set(ip, {
          count: limit.count + 1,
          timestamp: limit.timestamp,
        });
      } else {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    const { schoolCode, studentId } = await req.json();

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { valid: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      || "elite-is";
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // Step 1 — Find school by code using REST API
    const schoolQuery = await fetch(
      `${baseUrl}:runQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "schools" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "schoolCode" },
                op: "EQUAL",
                value: { stringValue: schoolCode.toUpperCase() },
              },
            },
            limit: 1,
          },
        }),
      }
    );

    const schoolResults = await schoolQuery.json();

    if (!schoolResults?.[0]?.document) {
      return NextResponse.json({ valid: false });
    }

    // Extract school ID from document name
    const schoolDocName = schoolResults[0].document.name as string;
    const schoolId = schoolDocName.split("/").pop();

    // Step 2 — Find student by ID
    const studentQuery = await fetch(
      `${baseUrl}:runQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{
              collectionId: "students",
              allDescendants: false,
            }],
            where: {
              fieldFilter: {
                field: { fieldPath: "id" },
                op: "EQUAL",
                value: {
                  stringValue: studentId.toUpperCase()
                },
              },
            },
            limit: 1,
          },
        }),
      }
    );

    const studentResults = await studentQuery.json();

    if (!studentResults?.[0]?.document) {
      return NextResponse.json({ valid: false });
    }

    const studentDoc = studentResults[0].document;
    const studentDocName = studentDoc.name as string;
    const studentDocId = studentDocName.split("/").pop();
    const fields = studentDoc.fields || {};

    // Check if parent already linked
    if (fields.parentUid?.stringValue) {
      return NextResponse.json({
        valid: false,
        error: "already_linked",
      });
    }

    return NextResponse.json({
      valid: true,
      schoolId,
      studentDocId,
      studentName: fields.name?.stringValue || "",
    });

  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("verify-student error:", err);
    }
    return NextResponse.json(
      { valid: false, error: "Server error" },
      { status: 500 }
    );
  }
}
