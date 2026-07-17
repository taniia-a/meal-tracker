const authBaseUrl = process.env.VITE_NEON_AUTH_URL;

export default {
  async fetch(request: Request): Promise<Response> {
    if (!authBaseUrl) return Response.json({ error: 'Neon Auth não está configurado.' }, { status: 500 });

    const incomingUrl = new URL(request.url);
    const path = incomingUrl.searchParams.get('path') ?? '';
    const query = new URLSearchParams(incomingUrl.searchParams);
    query.delete('path');

    const upstreamUrl = new URL(`${authBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
    query.forEach((value, key) => upstreamUrl.searchParams.append(key, value));

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');

    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstream = await fetch(upstreamUrl, { method: request.method, headers, body, redirect: 'manual' });

    const responseHeaders = new Headers(upstream.headers);
    const setCookies = typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [upstream.headers.get('set-cookie')].filter((value): value is string => Boolean(value));
    responseHeaders.delete('set-cookie');
    setCookies.forEach((cookie) => responseHeaders.append('set-cookie', cookie));

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  },
};
