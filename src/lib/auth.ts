import { createClient } from '@neondatabase/neon-js';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

// Keep auth cookies first-party in deployed builds. This is important for
// installed mobile web apps, where cross-site auth cookies are often blocked.
export const authUrl = import.meta.env.PROD
  ? `${window.location.origin}/api/neon-auth`
  : neonAuthUrl;
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

export async function getAuthToken(): Promise<string | null> {
  if (!authClient) return null;
  const session = await authClient.getSession();
  return session.data?.session.token ?? null;
}
