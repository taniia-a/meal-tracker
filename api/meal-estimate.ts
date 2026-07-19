const MAX_DESCRIPTION_LENGTH = 1_500;
const MAX_REQUESTS_PER_HOUR = 12;
const usageByUser = new Map<string, number[]>();

async function getAuthenticatedUser(token: string, dataApiUrl: string | undefined): Promise<string | null> {
  if (!dataApiUrl) return null;

  try {
    const response = await fetch(`${dataApiUrl.replace(/\/$/, '')}/profiles?select=user_id&limit=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const profiles = await response.json() as Array<{ user_id?: string }>;
    return profiles[0]?.user_id ?? null;
  } catch {
    return null;
  }
}

function canEstimate(userId: string) {
  const now = Date.now();
  const recent = (usageByUser.get(userId) ?? []).filter((time) => now - time < 60 * 60 * 1_000);
  if (recent.length >= MAX_REQUESTS_PER_HOUR) return false;
  usageByUser.set(userId, [...recent, now]);
  return true;
}

function readText(response: unknown) {
  const data = response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
}

export async function estimateMeal(request: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: 'A estimativa por IA ainda não está configurada.' }, { status: 503 });

    try {
      const body = await request.json() as { token?: string; description?: string; language?: string };
      const token = body.token ?? '';
      const description = body.description?.trim() ?? '';
      const userId = token ? await getAuthenticatedUser(token, env.VITE_NEON_DATA_API_URL) : null;
      if (!userId) return Response.json({ error: 'A tua sessão expirou. Inicia sessão novamente.' }, { status: 401 });
      if (!description || description.length > MAX_DESCRIPTION_LENGTH) return Response.json({ error: 'Descreve a refeição em até 1.500 caracteres.' }, { status: 400 });
      if (!canEstimate(userId)) return Response.json({ error: 'Atingiste o limite temporário de estimativas. Tenta novamente dentro de uma hora ou introduz os valores manualmente.' }, { status: 429 });

      const language = body.language?.startsWith('en') ? 'English' : 'Portuguese (Portugal)';
      const prompt = `Estimate the nutrition for this single consumed meal: ${description}\n\nReturn an honest best estimate for one serving. Use ${language} for name and note. Calories and macros must be non-negative numbers. Do not give medical advice. If quantities are unclear, make reasonable assumptions and explain them briefly in note.`;
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                calories: { type: 'NUMBER' },
                protein: { type: 'NUMBER' },
                carbs: { type: 'NUMBER' },
                fat: { type: 'NUMBER' },
                note: { type: 'STRING' },
              },
              required: ['name', 'calories', 'protein', 'carbs', 'fat', 'note'],
            },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!geminiResponse.ok) {
        const status = geminiResponse.status;
        if (status === 429) return Response.json({ error: 'A quota gratuita da IA foi atingida. Introduz os valores manualmente e tenta mais tarde.' }, { status: 429 });
        return Response.json({ error: 'Não foi possível obter uma estimativa agora. Tenta novamente mais tarde.' }, { status: 502 });
      }

      const output = JSON.parse(readText(await geminiResponse.json())) as Record<string, unknown>;
      const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value * 10) / 10) : 0;
      if (typeof output.name !== 'string' || !output.name.trim() || number(output.calories) <= 0) {
        return Response.json({ error: 'A IA não conseguiu criar uma estimativa utilizável. Introduz os valores manualmente.' }, { status: 422 });
      }
      return Response.json({ name: output.name.trim(), calories: number(output.calories), protein: number(output.protein), carbs: number(output.carbs), fat: number(output.fat), note: typeof output.note === 'string' ? output.note.trim() : '' });
    } catch {
      return Response.json({ error: 'Não foi possível contactar o assistente de estimativas. Tenta novamente.' }, { status: 500 });
    }
}

export default {
  async fetch(request: Request): Promise<Response> {
    return estimateMeal(request);
  },
};
