import { createClient } from '@neondatabase/neon-js';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

// In production, auth requests go through the app's own domain. This keeps the
// session cookie first-party, which is required by browsers that block
// cross-site cookies (notably mobile WebKit browsers).
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
