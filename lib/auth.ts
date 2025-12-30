/**
 * Authentication Helpers
 *
 * Handles session verification and user retrieval.
 * Uses custom email OTP sessions (sesame_session cookie).
 */

import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "sesame_session";
const USER_ID_COOKIE = "sesame_user_id";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface SessionData {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Parse and validate session token
 */
function parseSession(token: string): SessionData | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as SessionData;

    // Check expiry
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user
 *
 * Priority order:
 * 1. Real session (sesame_session cookie) - verify by ID first, fallback to email
 * 2. User ID cookie (sesame_user_id) - fallback for session edge cases
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  // Check for session token
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = parseSession(sessionToken);
    if (session) {
      // First try to find user by ID (fast path)
      let user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true },
      });

      // If not found by ID, try by email (handles re-seeded users)
      if (!user && session.email) {
        user = await prisma.user.findUnique({
          where: { email: session.email },
          select: { id: true, email: true, name: true },
        });
      }

      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
        };
      }
    }
  }

  // Check for user ID cookie (fallback)
  const userId = cookieStore.get(USER_ID_COOKIE)?.value;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      };
    }
  }

  return null;
}

/**
 * Get or create the current user's student profile
 *
 * Priority:
 * 1. User's own profile (if exists)
 * 2. First shared profile via AccessGrant (if user has access to others)
 * 3. Create a new profile for the user
 */
export async function getCurrentProfileId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Try to find user's own profile first
  let profile = await prisma.studentProfile.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (profile) {
    return profile.id;
  }

  // Check if user has access to any shared profiles
  const accessGrant = await prisma.accessGrant.findFirst({
    where: {
      grantedToUserId: user.id,
      revokedAt: null,
    },
    select: {
      studentProfileId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (accessGrant) {
    // User has access to a shared profile - use that
    return accessGrant.studentProfileId;
  }

  // No profile and no shared access - create one
  // First ensure user exists in database
  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  // Create profile - use try/catch to handle race condition
  // where multiple requests try to create profile simultaneously
  try {
    profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        firstName: user.name?.split(" ")[0] || "Student",
        lastName: user.name?.split(" ").slice(1).join(" ") || undefined,
      },
      select: { id: true },
    });
    return profile.id;
  } catch (error) {
    // If unique constraint error (P2002), another request created the profile first
    // Just fetch and return it
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const existingProfile = await prisma.studentProfile.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (existingProfile) {
        return existingProfile.id;
      }
    }
    throw error;
  }
}

/**
 * Check if the current user is viewing their own profile or a shared one
 */
export async function getProfileOwnership(): Promise<{
  profileId: string;
  isOwner: boolean;
  ownerName?: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Check for user's own profile
  const ownProfile = await prisma.studentProfile.findFirst({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true },
  });

  if (ownProfile) {
    return {
      profileId: ownProfile.id,
      isOwner: true,
    };
  }

  // Check for shared access
  const accessGrant = await prisma.accessGrant.findFirst({
    where: {
      grantedToUserId: user.id,
      revokedAt: null,
    },
    select: {
      studentProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (accessGrant) {
    const ownerName = [
      accessGrant.studentProfile.firstName,
      accessGrant.studentProfile.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      profileId: accessGrant.studentProfile.id,
      isOwner: false,
      ownerName,
    };
  }

  return null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require profile - throws if not authenticated or no profile
 */
export async function requireProfile(): Promise<string> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    throw new Error("Profile not found");
  }
  return profileId;
}

/**
 * Clear authentication cookies (for logout)
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(USER_ID_COOKIE);
}
