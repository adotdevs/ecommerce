/**
 * OpenAI chat helper shared by product AI and translation.
 */

const DEFAULT_MODEL = "gpt-4o-mini";

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export async function openAiChatJson<T>(
  systemPrompt: string,
  userPrompt: string,
  opts?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = opts?.model ?? getOpenAiModel();
  const body = {
    model,
    temperature: opts?.temperature ?? 0.35,
    ...(opts?.maxTokens != null ? { max_tokens: opts.maxTokens } : {}),
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(
          `OpenAI request failed (${res.status}) model=${model} attempt=${attempt + 1}:`,
          errText.slice(0, 300)
        );
        if (attempt === 0 && (res.status >= 500 || res.status === 429)) continue;
        return null;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return null;

      try {
        return JSON.parse(raw) as T;
      } catch {
        console.error("OpenAI returned invalid JSON");
        return null;
      }
    } catch (err) {
      console.error(`OpenAI network error attempt=${attempt + 1}:`, err);
      if (attempt === 0) continue;
      return null;
    }
  }

  return null;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
