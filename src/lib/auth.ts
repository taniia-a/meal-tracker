import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

export const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

export const authClient = authUrl ? createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
}) : null;
