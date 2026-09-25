import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const CodeBlock = ({ code, className }: { code: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`relative border bg-muted/40 ${className ?? ""}`}>
      <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-7" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <pre className="overflow-x-auto p-4 pr-10 font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
};
