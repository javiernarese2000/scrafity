import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

// DeepSeek expone una API compatible con OpenAI.
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

export const deepseekProvider: AIProvider = {
  name: "deepseek",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY no está definida");

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        max_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature ?? 0.8,
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: data.choices[0]?.message.content ?? "",
      tokensIn: data.usage.prompt_tokens,
      tokensOut: data.usage.completion_tokens,
      provider: "deepseek",
    };
  },
};
