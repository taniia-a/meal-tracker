import pg from 'pg';

type PushSubscriptionPayload = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
type ReminderPayload = { meals?: boolean; mealsTime?: string; water?: boolean; weight?: boolean; weightTime?: string };

async function authenticatedUser(token: string, dataApiUrl?: string) {
  if (!dataApiUrl) return null;
  const response = await fetch(`${dataApiUrl.replace(/\/$/, '')}/profiles?select=user_id&limit=1`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!response.ok) return null;
  const data = await response.json() as Array<{ user_id?: string }>;
  return data[0]?.user_id ?? null;
}

function connectionString(env: Record<string, string | undefined>) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL não está configurada.');
  return env.DATABASE_URL;
}

export async function pushSubscription(request: Request, env: Record<string, string | undefined> = process.env) {
  if (!['POST', 'DELETE'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  if (!env.DATABASE_URL) return Response.json({ error: 'Falta configurar DATABASE_URL no servidor.' }, { status: 503 });
  if (!env.VITE_NEON_DATA_API_URL) return Response.json({ error: 'Falta configurar VITE_NEON_DATA_API_URL no servidor.' }, { status: 503 });
  try {
    const body = await request.json() as { token?: string; subscription?: PushSubscriptionPayload; reminders?: ReminderPayload; endpoint?: string };
    const userId = await authenticatedUser(body.token ?? '', env.VITE_NEON_DATA_API_URL);
    if (!userId) return Response.json({ error: 'A tua sessão expirou. Inicia sessão novamente.' }, { status: 401 });
    const client = new pg.Client({ connectionString: connectionString(env) });
    await client.connect();
    try {
      if (request.method === 'DELETE') {
        await client.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, body.endpoint ?? '']);
      } else {
        const subscription = body.subscription;
        if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return Response.json({ error: 'Subscrição push inválida.' }, { status: 400 });
        const reminders = { meals: Boolean(body.reminders?.meals), mealsTime: body.reminders?.mealsTime ?? '21:00', water: Boolean(body.reminders?.water), weight: Boolean(body.reminders?.weight), weightTime: body.reminders?.weightTime ?? '08:00' };
        await client.query(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, reminders)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, reminders = EXCLUDED.reminders, updated_at = NOW()`, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, JSON.stringify(reminders)]);
      }
    } finally { await client.end(); }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('push-subscription failed', error);
    return Response.json({ error: 'Não foi possível guardar a subscrição de notificações.' }, { status: 500 });
  }
}

export default { fetch: (request: Request) => pushSubscription(request) };
