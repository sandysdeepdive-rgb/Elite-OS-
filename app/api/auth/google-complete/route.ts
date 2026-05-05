import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const apiSecret = req.headers.get("x-api-secret");
  if (apiSecret !== process.env.NEXT_PUBLIC_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uid, email, name, role, schoolCode, studentId } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Case 1 — Returning user (document exists)
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      const data = userDoc.data();
      const status = data?.status;
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

    const schoolsSnap = await adminDb.collection("schools").where("schoolCode", "==", schoolCode).limit(1).get();
    if (schoolsSnap.empty) {
      return NextResponse.json({ error: "Invalid school code" }, { status: 404 });
    }
    const schoolId = schoolsSnap.docs[0].id;

    if (role === "parent") {
      if (!studentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });
      const studentDoc = await adminDb.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
      if (!studentDoc.exists) return NextResponse.json({ error: "Student ID not found" }, { status: 404 });
    }

    const userDocData = {
      uid,
      email: email.toLowerCase().trim(),
      name,
      role,
      schoolId,
      schoolCode,
      status: "pending",
      linkedId: studentId || null,
      phone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection("users").doc(uid).set(userDocData);
    
    return NextResponse.json({ exists: false, created: true, status: "pending" });

  } catch (error: any) {
    console.error("Google complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
