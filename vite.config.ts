import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const allowedContentTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function isAuthenticated(token: string, dataApiUrl: string): Promise<boolean> {
  const response = await fetch(`${dataApiUrl.replace(/\/$/, '')}/profiles?select=user_id&limit=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) return false;
  const profiles = await response.json() as unknown[];
  return profiles.length === 1;
}

function localBlobUpload(env: Record<string, string>): Plugin {
  return {
    name: 'local-blob-upload',
    configureServer(server) {
      server.middlewares.use('/api/recipe-image-upload', async (request, response) => {
        if (request.method !== 'POST') { response.statusCode = 405; response.end('Method not allowed'); return; }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as HandleUploadBody;
          const webRequest = new Request('http://localhost/api/recipe-image-upload', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
          });
          const result = await handleUpload({
            request: webRequest,
            body,
            token: env.BLOB_READ_WRITE_TOKEN,
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
              const payload = JSON.parse(clientPayload ?? '{}') as { token?: string };
              if (!payload.token || !env.VITE_NEON_DATA_API_URL || !(await isAuthenticated(payload.token, env.VITE_NEON_DATA_API_URL))) {
                throw new Error('Não tens autorização para enviar imagens.');
              }
              return { allowedContentTypes, maximumSizeInBytes: 5 * 1024 * 1024, addRandomSuffix: true };
            },
            onUploadCompleted: async () => {},
          });
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = 400;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Não foi possível enviar a imagem.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), localBlobUpload(env)] };
});
