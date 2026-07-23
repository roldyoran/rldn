import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better Auth configuration
 * Use this in React components for client-side auth operations
 */
export const authClient = createAuthClient();

/**
 * Convenience helpers for auth operations
 */
export const { signIn, signUp, signOut, useSession } = authClient;
