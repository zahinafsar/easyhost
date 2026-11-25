import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const MARKDOWN_CLASSES = [
  "min-w-0 space-y-2.5 text-sm leading-relaxed break-words text-foreground",
  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:marker:text-muted-foreground",
  "[&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-medium [&_h2]:text-[15px] [&_h2]:font-medium [&_h3]:font-medium",
  "[&_a]:text-accent-green [&_a]:underline [&_a]:underline-offset-4",
  "[&_code]:rounded-xs [&_code]:border [&_code]:border-border [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/8 [&_pre]:bg-[#0a0c14] [&_pre]:p-3.5 [&_pre]:text-[#e6e9ef] [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-accent-green [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_table]:w-full [&_table]:text-[13px] [&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
].join(" ");

export const Markdown = ({ children, className }: { children: string; className?: string }) => {
  return (
    <div data-slot="markdown" className={cn(MARKDOWN_CLASSES, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
};
