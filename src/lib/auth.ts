import { createClient } from '@neondatabase/neon-js';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

export const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
export const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL as string | undefined;

export const neonClient = authUrl && dataApiUrl ? createClient({
  auth: {
    url: authUrl,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: dataApiUrl,
  },
}) : null;

export const authClient = neonClient?.auth ?? null;
