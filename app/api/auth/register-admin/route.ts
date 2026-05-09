import { NextRequest, NextResponse } from "next/server";
import { getDocument, setDocument, queryCollection } from "@/lib/firestore-rest";

export async function POST(req: NextRequest) {
  const apiSecret = req.headers.get("x-api-secret");
  if (apiSecret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uid, email, name, schoolName, schoolCode, phone } = await req.json();

    if (!uid || !email || !name || !schoolName || !schoolCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!name.trim() || !schoolName.trim() || !schoolCode.trim()) {
      return NextResponse.json({ error: "Fields cannot be empty" }, { status: 400 });
    }

    // Validate schoolCode format — alphanumeric, hyphens, 3–20 chars
    if (!/^[a-zA-Z0-9-]{3,20}$/.test(schoolCode)) {
      return NextResponse.json({ error: "School code must be 3–20 alphanumeric characters" }, { status: 400 });
    }

    // Check school code uniqueness
    const existing = await queryCollection("schools", "schoolCode", schoolCode);
    if (existing.length > 0) {
      return NextResponse.json({ error: "School code already in use" }, { status: 409 });
    }

    const schoolId = "school-" + Date.now() + "-" +
      Math.random().toString(36).substring(2, 8);

    await setDocument(`schools/${schoolId}`, {
      schoolId,
      schoolName: schoolName.trim(),
      schoolCode: schoolCode.trim(),
      adminUid: uid,
      createdAt: new Date().toISOString(),
      plan: "trial",
      active: true,
    });

    await setDocument(`users/${uid}`, {
      uid,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: "admin",
      schoolId,
      schoolCode: schoolCode.trim(),
      status: "approved",
      linkedId: null,
      phone: phone || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDocument(`schools/${schoolId}/settings/feeStructure`, {
      senior1_2: 700000,
      senior3_4: 850000,
      senior5_6: 950000,
      updatedAt: new Date().toISOString(),
    });

    // Verify both critical documents exist
    const schoolDoc = await getDocument(`schools/${schoolId}`);
    const userDoc = await getDocument(`users/${uid}`);

    if (!schoolDoc || !userDoc) {
      // Need a proper delete endpoint if we want cleanup, but REST API delete is missing, so simply error out
      return NextResponse.json(
        { error: "Account setup failed during verification. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, schoolId });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin registration error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
