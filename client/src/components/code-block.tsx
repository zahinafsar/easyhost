import { cn } from "@/lib/utils";
import { Box } from "@/components/ui/box";
import { CopyButton } from "@/components/ui/copy-button";
import { Pre } from "@/components/ui/code";

export const CodeBlock = ({ code, className, tone = "default" }: { code: string; className?: string; tone?: "default" | "terminal" }) => {
  return (
    <Box className={cn("group/code relative min-w-0", className)}>
      <CopyButton
        value={code}
        variant="ghost"
        className={cn("absolute top-2 right-2 z-10 bg-surface", tone === "terminal" && "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white")}
      />
      <Pre tone={tone} className="pr-12">
        {code}
      </Pre>
    </Box>
  );
};
