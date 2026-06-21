import Anthropic from "@anthropic-ai/sdk";

import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

// Sonnet por defecto (calidad/costo). Opus 4.8 para casos de alta exigencia.
const MODEL = "claude-sonnet-4-6";

export const claudeProvider: AIProvider = {
  name: "claude",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está definida");

    const client = new Anthropic({ apiKey });

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: input.maxTokens ?? 2048,
      temperature: input.temperature ?? 0.8,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    });

    const text = msg.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      text,
      tokensIn: msg.usage.input_tokens,
      tokensOut: msg.usage.output_tokens,
      provider: "claude",
    };
  },
};
