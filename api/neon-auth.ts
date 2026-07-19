import { authProxy } from './auth/[...path]';

export async function neonAuthProxy(request: Request, env: Record<string, string | undefined> = process.env) {
  const url = new URL(request.url);
  const authPath = url.searchParams.get('authPath') ?? '';
  url.searchParams.delete('authPath');

  // Pass through any regular query parameters that accompanied the request.
  const proxiedRequest = new Request(url, request);
  return authProxy(proxiedRequest, env, authPath);
}

export default { fetch: (request: Request) => neonAuthProxy(request) };
