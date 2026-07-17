import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

const allowedContentTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function isAuthenticated(token: string): Promise<boolean> {
  const dataApiUrl = process.env.VITE_NEON_DATA_API_URL;
  if (!dataApiUrl) return false;

  try {
    const response = await fetch(`${dataApiUrl.replace(/\/$/, '')}/profiles?select=user_id&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const profiles = await response.json() as unknown[];
    return profiles.length === 1;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return Response.json({ error: 'O Vercel Blob não está configurado no ambiente de produção.' }, { status: 500 });

    try {
      const body = await request.json() as HandleUploadBody;
      const result = await handleUpload({
        request,
        body,
        token: blobToken,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          let payload: { token?: string };
          try {
            payload = JSON.parse(clientPayload ?? '{}') as { token?: string };
          } catch {
            throw new Error('Pedido de upload inválido.');
          }
          const token = payload.token ?? '';
          if (!token || !(await isAuthenticated(token))) throw new Error('Não tens autorização para enviar imagens.');

          return {
            allowedContentTypes,
            maximumSizeInBytes: 5 * 1024 * 1024,
            addRandomSuffix: true,
          };
        },
        onUploadCompleted: async () => {},
      });
      return Response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a imagem.';
      return Response.json({ error: message }, { status: 400 });
    }
  },
};
