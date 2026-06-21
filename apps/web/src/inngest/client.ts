import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "scrapify" });

export type RewriteRequested = {
  articleId: string;
  nVersiones: number;
  tono?: string;
  proveedor?: "deepseek" | "claude" | "auto";
};
