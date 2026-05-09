import { NextRequest, NextResponse } from "next/server";
import { getDocument, setDocument, queryCollection } from "@/lib/firestore-rest";

export async function POST(req: NextRequest) {
  const apiSecret = req.headers.get("x-api-secret");
  if (apiSecret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uid, email, name, role, schoolCode, studentId } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role && !["teacher", "parent"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Case 1 — Returning user (document exists)
    const data = await getDocument(`users/${uid}`);

    if (data) {
      const status = data?.status as string | undefined;
      if (status === "approved" || status === "pending") {
        return NextResponse.json({ exists: true, role: data?.role, schoolId: data?.schoolId, status });
      }
      return NextResponse.json({ exists: true, status: "rejected" });
    }

    // New Google user
    if (!role) {
      // Case 3 — New Google user, no role info provided
      return NextResponse.json({ exists: false, created: false });
    }

    // Case 2 — New Google user, role info provided
    if (role === "admin") {
      return NextResponse.json({ error: "Admin role not supported via this flow" }, { status: 400 });
    }

    // Teacher or Parent
    if (!schoolCode) {
      return NextResponse.json({ error: "School code required" }, { status: 400 });
    }

    const existingSchools = await queryCollection("schools", "schoolCode", schoolCode);
    if (existingSchools.length === 0) {
      return NextResponse.json({ error: "Invalid school code" }, { status: 404 });
    }
    const schoolId = existingSchools[0].id;

    if (role === "parent") {
      if (!studentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });
      const studentDoc = await getDocument(`schools/${schoolId}/students/${studentId}`);
      if (!studentDoc) return NextResponse.json({ error: "Student ID not found" }, { status: 404 });
    }

    const userDocData = {
      uid,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      schoolId,
      schoolCode,
      status: "pending",
      linkedId: studentId || null,
      phone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDocument(`users/${uid}`, userDocData);

    // Verify write succeeded
    const verify = await getDocument(`users/${uid}`);
    if (!verify) {
      return NextResponse.json({ error: "Profile creation failed. Please try again." }, { status: 500 });
    }
    
    return NextResponse.json({ exists: false, created: true, status: "pending" });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google complete error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
