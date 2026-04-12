import { User } from "@/types/UserType";

/**
 * Checks if a user is currently banned.
 * A user is considered banned if isBanned is true AND 
 * (banExpires is null (permanent) OR banExpires is in the future).
 */
export function isUserBanned(user: Partial<User>): { banned: boolean; expires?: Date | null; needsCleanup?: boolean } {
  if (!user.isBanned) {
    return { banned: false };
  }

  // Check expiration if it exists
  if (user.banExpires) {
    const expires = new Date(user.banExpires);
    if (expires < new Date()) {
      // Ban has expired
      return { banned: false, needsCleanup: true };
    }
    return { banned: true, expires };
  }

  // Permanent ban
  return { banned: true, expires: null };
}
