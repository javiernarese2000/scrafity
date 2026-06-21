export type ProviderName = "deepseek" | "claude";

export interface GenerateInput {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  provider: ProviderName;
}

export interface AIProvider {
  readonly name: ProviderName;
  generate(input: GenerateInput): Promise<GenerateResult>;
}
