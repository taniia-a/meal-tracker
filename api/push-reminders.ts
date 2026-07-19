import pg from 'pg';
import webpush from 'web-push';

type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; reminders: { meals?: boolean; mealsTime?: string; water?: boolean; weight?: boolean; weightTime?: string } };

function portugalTime() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts();
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return { day: `${part('year')}-${part('month')}-${part('day')}`, weekday: part('weekday'), hour: Number(part('hour')), minute: Number(part('minute')) };
}

function timeMatches(time: string | undefined, hour: number, minute: number) {
  const [targetHour, targetMinute] = (time ?? '21:00').split(':').map(Number);
  return hour === targetHour && minute >= targetMinute && minute < targetMinute + 5;
}

export async function pushReminders(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  if (!process.env.DATABASE_URL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return new Response('Push is not configured', { status: 503 });
  let client: pg.Client | undefined;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const now = portugalTime();
    const { rows } = await client.query<SubscriptionRow>('SELECT id, user_id, endpoint, p256dh, auth, reminders FROM push_subscriptions');
    for (const subscription of rows) {
      const jobs: Array<{ kind: 'meals' | 'water' | 'weight'; title: string; body: string; slot: string }> = [];
      if (subscription.reminders.meals && timeMatches(subscription.reminders.mealsTime, now.hour, now.minute)) {
        const { rows: mealRows } = await client.query<{ meal_type: string }>('SELECT DISTINCT meal_type FROM meal_entries WHERE user_id = $1 AND meal_date = $2', [subscription.user_id, now.day]);
        if (mealRows.length < 4) jobs.push({ kind: 'meals', title: 'Meal Tracker', body: 'Não te esqueças de registar as tuas refeições de hoje.', slot: `${now.day}-meals` });
      }
      if (subscription.reminders.water && now.hour >= 8 && now.hour < 22 && now.minute < 5) jobs.push({ kind: 'water', title: 'Meal Tracker', body: 'Lembra-te de beber água e registar o que bebeste.', slot: `${now.day}-water-${now.hour}` });
      if (subscription.reminders.weight && now.weekday === 'Sun' && timeMatches(subscription.reminders.weightTime, now.hour, now.minute)) jobs.push({ kind: 'weight', title: 'Meal Tracker', body: 'Está na altura de registar o teu peso desta semana.', slot: `${now.day}-weight` });
      for (const job of jobs) {
        const logged = await client.query('SELECT 1 FROM push_notification_log WHERE subscription_id = $1 AND kind = $2 AND slot = $3', [subscription.id, job.kind, job.slot]);
        if (logged.rowCount) continue;
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: job.title, body: job.body, url: '/' }));
          await client.query('INSERT INTO push_notification_log (subscription_id, kind, slot) VALUES ($1, $2, $3)', [subscription.id, job.kind, job.slot]);
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) await client.query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.id]);
        }
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('push-reminders failed', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return Response.json({ error: `Não foi possível processar os lembretes: ${message}` }, { status: 500 });
  } finally {
    await client?.end();
  }
}

export default { fetch: (request: Request) => pushReminders(request) };
