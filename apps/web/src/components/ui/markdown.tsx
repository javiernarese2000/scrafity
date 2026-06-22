import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/cn";

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed text-fg",
        "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium",
        "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-medium",
        "[&_p]:my-3",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
        "[&_a]:text-brand [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-muted",
        "[&_img]:my-3 [&_img]:rounded-lg",
        "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border [&_th]:border-line [&_th]:bg-elevated [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
