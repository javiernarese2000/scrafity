import Anthropic from "@anthropic-ai/sdk";

import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

// Haiku 4.5: rápido y barato, buen equilibrio para reescritura de notas.
const MODEL = "claude-haiku-4-5-20251001";

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
