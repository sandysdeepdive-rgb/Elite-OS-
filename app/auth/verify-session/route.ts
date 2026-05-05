import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  const expectedRole = req.nextUrl.searchParams.get("role");

  if (!uid) {
    return NextResponse.json({ valid: false, reason: "no_profile" });
  }

  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ valid: false, reason: "no_profile" });
    }

    const data = userDoc.data();
    const status = data?.status?.toLowerCase().trim();
    const role = data?.role?.toLowerCase().trim();

    if (status !== "approved") {
      return NextResponse.json({ valid: false, reason: "not_approved" });
    }

    if (expectedRole && role !== expectedRole) {
      return NextResponse.json({ valid: false, reason: "wrong_role", redirectRole: role });
    }

    return NextResponse.json({ valid: true, role, schoolId: data?.schoolId });
  } catch (error) {
    return NextResponse.json({ valid: false, reason: "server_error" });
  }
}
