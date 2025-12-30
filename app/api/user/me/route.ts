/**
 * GET /api/user/me
 * Returns current user info including admin status
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_EMAILS } from "@/lib/admin";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: ADMIN_EMAILS.includes(user.email),
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
