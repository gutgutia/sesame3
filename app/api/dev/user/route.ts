/**
 * Dev User API
 * Sets/gets the current dev user via cookies
 * Only works in development mode
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEV_USER_COOKIE = "sesame_dev_user_id";

// GET: Return current dev user ID
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(DEV_USER_COOKIE)?.value;

  return NextResponse.json({ userId: userId || null });
}

// POST: Set the dev user
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const { userId } = await request.json();

  const cookieStore = await cookies();

  if (userId) {
    cookieStore.set(DEV_USER_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.NODE_ENV as string) === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } else {
    cookieStore.delete(DEV_USER_COOKIE);
  }

  return NextResponse.json({ success: true, userId });
}

// DELETE: Clear the dev user
export async function DELETE() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEV_USER_COOKIE);

  return NextResponse.json({ success: true });
}
