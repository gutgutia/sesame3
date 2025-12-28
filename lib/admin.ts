import { getCurrentUser, type AuthUser } from "@/lib/auth";

// Admin email whitelist - only these emails can access admin features
export const ADMIN_EMAILS = ["abhishek.gutgutia@gmail.com"];

/**
 * Check if the current user is an admin
 * Returns the user if admin, throws if not
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Check if the current user is an admin (non-throwing)
 * Returns true/false
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.log("[Admin Check] No user found");
      return false;
    }

    const result = ADMIN_EMAILS.includes(user.email);
    console.log(`[Admin Check] Email: ${user.email}, isAdmin: ${result}`);
    return result;
  } catch (error) {
    console.log("[Admin Check] Error:", error);
    return false;
  }
}
