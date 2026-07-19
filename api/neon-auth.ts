const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'forwarded',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function copyRequestHeaders(request: Request) {
  const headers = new Headers();
  request.headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(normalizedName) && !normalizedName.startsWith('x-forwarded-') && !normalizedName.startsWith('x-vercel-')) {
      headers.set(name, value);
    }
  });
  return headers;
}

function copyResponseHeaders(response: Response) {
  const headers = new Headers();
  response.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) headers.append(name, value);
  });

  const setCookieHeaders = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookieHeaders?.length) {
    headers.delete('set-cookie');
    setCookieHeaders.forEach((cookie) => headers.append('set-cookie', cookie));
  }
  return headers;
}

export async function neonAuthProxy(request: Request, env: Record<string, string | undefined> = process.env) {
  const authUrl = env.NEON_AUTH_URL;
  if (!authUrl) return Response.json({ error: 'NEON_AUTH_URL não está configurada no servidor.' }, { status: 503 });

  try {
    const incoming = new URL(request.url);
    const authPath = incoming.searchParams.get('authPath') ?? '';
    incoming.searchParams.delete('authPath');
    const upstream = new URL(authPath, `${authUrl.replace(/\/$/, '')}/`);
    upstream.search = incoming.search;

    const response = await fetch(upstream, {
      method: request.method,
      headers: copyRequestHeaders(request),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
      duplex: 'half',
    } as RequestInit);

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: copyResponseHeaders(response) });
  } catch (error) {
    console.error('Neon Auth proxy failed', error);
    return Response.json({ error: 'Não foi possível contactar o serviço de autenticação.' }, { status: 502 });
  }
}

export default { fetch: (request: Request) => neonAuthProxy(request) };
