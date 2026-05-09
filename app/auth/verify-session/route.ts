import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/firestore-rest";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  const expectedRole = req.nextUrl.searchParams.get("role");

  if (!uid) {
    return NextResponse.json({ valid: false, reason: "no_profile" });
  }

  try {
    const data = await getDocument(`users/${uid}`);
    
    if (!data) {
      return NextResponse.json({ valid: false, reason: "no_profile" });
    }

    const status = (data?.status as string)?.toLowerCase().trim();
    const role = (data?.role as string)?.toLowerCase().trim();

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
