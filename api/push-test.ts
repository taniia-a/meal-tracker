import pg from 'pg';
import webpush from 'web-push';

async function authenticatedUser(token: string, dataApiUrl?: string) {
  if (!dataApiUrl) return null;
  const response = await fetch(`${dataApiUrl.replace(/\/$/, '')}/profiles?select=user_id&limit=1`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!response.ok) return null;
  const data = await response.json() as Array<{ user_id?: string }>;
  return data[0]?.user_id ?? null;
}

export async function pushTest(request: Request, env: Record<string, string | undefined> = process.env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.DATABASE_URL || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return Response.json({ error: 'As notificações push ainda não estão configuradas no servidor.' }, { status: 503 });
  try {
    const body = await request.json() as { token?: string; endpoint?: string };
    const userId = await authenticatedUser(body.token ?? '', env.VITE_NEON_DATA_API_URL);
    if (!userId) return Response.json({ error: 'A tua sessão expirou. Inicia sessão novamente.' }, { status: 401 });
    const client = new pg.Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query<{ endpoint: string; p256dh: string; auth: string }>('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, body.endpoint ?? '']);
      const subscription = result.rows[0];
      if (!subscription) return Response.json({ error: 'Este dispositivo ainda não está subscrito nas notificações push.' }, { status: 404 });
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: 'Meal Tracker', body: 'Esta é uma notificação push de teste.', url: '/definicoes' }));
    } finally { await client.end(); }
    return Response.json({ ok: true });
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return Response.json({ error: statusCode === 410 ? 'A subscrição deste dispositivo expirou. Ativa novamente as notificações.' : 'Não foi possível enviar a notificação push de teste.' }, { status: 500 });
  }
}

export default { fetch: (request: Request) => pushTest(request) };
