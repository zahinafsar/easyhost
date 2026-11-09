import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  ListChecks,
  Palette,
  Database,
  ExternalLink,
  FileCode2,
  HardDrive,
  Mail,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap } from "@/lib/api";
import { aiAppsQuery, appsQuery, tokensQuery } from "@/lib/queries";
import { selectedProjectId } from "@/lib/project";
import { cn } from "@/lib/utils";
import { useApiMutation } from "@/hooks/use-api-mutation";

type TextStep = { id: string; type: "text"; text: string };
type ToolStep = {
  id: string;
  type: "tool";
  tool: string;
  status: "running" | "done" | "error";
  title: string;
  detail: string | null;
  output: string | null;
};
type QuestionsStep = {
  id: string;
  type: "questions";
  questions: { id: string; text: string; options: string[] }[];
  answers: Record<string, string> | null;
};
type PlanStep = { id: string; type: "plan"; summary: string; items: string[]; status: "pending" | "approved" | "changes" };
type ThemeStep = { id: string; type: "theme"; chosen: string | null };
type Step = TextStep | ToolStep | QuestionsStep | PlanStep | ThemeStep;
type Theme = {
  id: string;
  name: string;
  dark: boolean;
  colors: { background: string; surface: string; foreground: string; muted: string; border: string; primary: string; primaryForeground: string };
  radius: string;
  font: string;
};
type Respond = (body: { stepId: string; answers?: Record<string, string>; approve?: true; theme?: string }) => void;
type CardProps = { respond?: Respond; pending: boolean };
type LiveEvent =
  | { type: "snapshot"; steps: Step[]; generating: boolean }
  | { type: "step"; step: Step }
  | { type: "done"; status: string; error: string | null };

const TOOL_ICONS: Record<string, typeof FileCode2> = {
  write_file: FileCode2,
  delete_file: Trash2,
  run_sql: Database,
  install_packages: Package,
  read_logs: Terminal,
  connect_storage: HardDrive,
  setup_email: Mail,
};

const displayStatus = (aiStatus: string, status: string) => {
  if (aiStatus === "GENERATING" || aiStatus === "FAILED") {
    return aiStatus;
  }
  return status;
};

const upsert = (steps: Step[], step: Step) => {
  const index = steps.findIndex((item) => item.id === step.id);
  if (index === -1) {
    return [...steps, step];
  }
  const next = [...steps];
  next[index] = step;
  return next;
};

const StatusIcon = ({ status }: { status: ToolStep["status"] }) => {
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-primary" />;
  }
  if (status === "error") {
    return <X className="size-3.5 text-destructive" />;
  }
  return <Check className="size-3.5 text-emerald-600" />;
};

const ToolStepView = ({ step }: { step: ToolStep }) => {
  const [open, setOpen] = useState<boolean | null>(null);
  const detailRef = useRef<HTMLPreElement>(null);
  const Icon = TOOL_ICONS[step.tool] ?? FileCode2;
  const hasBody = !!step.detail || !!step.output;
  const expanded = hasBody && (open ?? step.status !== "done");

  useEffect(() => {
    if (step.status === "running" && detailRef.current) {
      detailRef.current.scrollTop = detailRef.current.scrollHeight;
    }
  }, [step.detail, step.status]);

  return (
    <div className="border bg-background">
      <button
        type="button"
        disabled={!hasBody}
        onClick={() => setOpen(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs disabled:cursor-default"
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono">{step.title}</span>
        <StatusIcon status={step.status} />
        {hasBody && <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />}
      </button>
      {expanded && (
        <div className="border-t">
          {step.detail && (
            <pre ref={detailRef} className="max-h-64 overflow-auto bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-100">
              {step.detail}
            </pre>
          )}
          {step.output && (
            <pre
              className={cn(
                "max-h-48 overflow-auto p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap",
                step.status === "error" && "text-destructive",
              )}
            >
              {step.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const MARKDOWN_CLASSES = [
  "min-w-0 space-y-2 text-sm leading-relaxed break-words",
  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_strong]:font-semibold [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
  "[&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:overflow-x-auto [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_pre]:text-zinc-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:w-full [&_th]:border [&_th]:px-2 [&_th]:text-left [&_td]:border [&_td]:px-2",
].join(" ");

const Markdown = ({ text }: { text: string }) => (
  <div className={MARKDOWN_CLASSES}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>
);

const CardShell = ({ icon: Icon, title, children }: { icon: typeof FileCode2; title: string; children: React.ReactNode }) => (
  <div className="space-y-3 border bg-background p-3">
    <p className="flex items-center gap-2 text-sm font-medium">
      <Icon className="size-4 text-primary" />
      {title}
    </p>
    {children}
  </div>
);

const QuestionsCard = ({ step, respond, pending }: { step: QuestionsStep } & CardProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  if (step.answers) {
    const given = step.answers;
    return (
      <CardShell icon={CircleHelp} title="Questions">
        <ul className="space-y-1 text-sm">
          {step.questions.map((question) => (
            <li key={question.id}>
              <span className="text-muted-foreground">{question.text}</span> {given[question.id]}
            </li>
          ))}
        </ul>
      </CardShell>
    );
  }
  return (
    <CardShell icon={CircleHelp} title="A few questions first">
      <div className="space-y-4">
        {step.questions.map((question) => (
          <div key={question.id} className="space-y-2">
            <p className="text-sm">{question.text}</p>
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={answers[question.id] === option ? "default" : "outline"}
                  disabled={!respond || pending}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                >
                  {option}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type your own answer"
              disabled={!respond || pending}
              value={question.options.includes(answers[question.id] ?? "") ? "" : (answers[question.id] ?? "")}
              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        disabled={!respond || pending || !step.questions.every((question) => answers[question.id]?.trim())}
        onClick={() => respond?.({ stepId: step.id, answers })}
      >
        Submit answers
      </Button>
    </CardShell>
  );
};

const PlanCard = ({ step, respond, pending, onChange }: { step: PlanStep; onChange: () => void } & CardProps) => (
  <CardShell icon={ListChecks} title="Plan">
    <p className="text-sm">{step.summary}</p>
    <ul className="space-y-1.5">
      {step.items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm">
          <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          {item}
        </li>
      ))}
    </ul>
    {step.status === "approved" && (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="size-3.5 text-emerald-600" />
        Approved
      </p>
    )}
    {step.status === "pending" && respond && (
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond({ stepId: step.id, approve: true })}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={onChange}>
          Change something
        </Button>
      </div>
    )}
  </CardShell>
);

const ThemePreview = ({ theme, selected, disabled, onPick }: { theme: Theme; selected: boolean; disabled: boolean; onPick: () => void }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onPick}
    className={cn("flex flex-col border text-left disabled:cursor-default", selected && "border-primary ring-2 ring-primary/30")}
  >
    <p className="truncate border-b px-2.5 py-1.5 text-xs font-medium">{theme.name}</p>
    <div
      className="flex-1 space-y-2 p-2.5"
      style={{ background: theme.colors.background, color: theme.colors.foreground, fontFamily: `"${theme.font}", sans-serif` }}
    >
      <div className="flex gap-1">
        {[theme.colors.primary, theme.colors.surface, theme.colors.muted, theme.colors.border].map((color) => (
          <span key={color} className="size-3 border border-black/10" style={{ background: color, borderRadius: theme.radius }} />
        ))}
      </div>
      <p className="text-lg leading-none font-semibold">Aa</p>
      <span
        className="inline-block px-2 py-0.5 text-[10px] font-medium"
        style={{ background: theme.colors.primary, color: theme.colors.primaryForeground, borderRadius: theme.radius }}
      >
        Button
      </span>
    </div>
    <p className="truncate border-t px-2.5 py-1.5 text-[11px] text-muted-foreground">{theme.font}</p>
  </button>
);

const ThemeCard = ({ step, themes, respond, pending }: { step: ThemeStep; themes: Theme[] } & CardProps) => {
  useEffect(() => {
    const id = "builder-theme-fonts";
    if (document.getElementById(id)) {
      return;
    }
    const families = [...new Set(themes.map((theme) => theme.font))].map((font) => `family=${font.replace(/ /g, "+")}:wght@400;600`).join("&");
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, [themes]);

  return (
    <CardShell icon={Palette} title={step.chosen ? "Theme" : "Pick a theme"}>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((theme) => (
          <ThemePreview
            key={theme.id}
            theme={theme}
            selected={step.chosen === theme.id}
            disabled={!!step.chosen || !respond || pending}
            onPick={() => respond?.({ stepId: step.id, theme: theme.id })}
          />
        ))}
      </div>
    </CardShell>
  );
};

const StepsView = ({
  steps,
  themes = [],
  respond,
  pending = false,
  onChangePlan = () => undefined,
}: {
  steps: Step[];
  themes?: Theme[];
  respond?: Respond;
  pending?: boolean;
  onChangePlan?: () => void;
}) => (
  <div className="space-y-2">
    {steps.map((step) => {
      if (step.type === "text") {
        return <Markdown key={step.id} text={step.text} />;
      }
      if (step.type === "questions") {
        return <QuestionsCard key={step.id} step={step} respond={respond} pending={pending} />;
      }
      if (step.type === "plan") {
        return <PlanCard key={step.id} step={step} respond={respond} pending={pending} onChange={onChangePlan} />;
      }
      if (step.type === "theme") {
        return <ThemeCard key={step.id} step={step} themes={themes} respond={respond} pending={pending} />;
      }
      return <ToolStepView key={step.id} step={step} />;
    })}
  </div>
);

export const BuilderAppPage = () => {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(aiAppsQuery().detail(id));
  const [prompt, setPrompt] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [liveSteps, setLiveSteps] = useState<Step[]>([]);
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const wasGenerating = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const tokens = useQuery(tokensQuery().summary());

  const generating = data?.app.aiStatus === "GENERATING";
  const messageCount = data?.messages.length ?? 0;

  useEffect(() => {
    if (!generating) {
      return;
    }
    const source = new EventSource(`/api/ai-apps/${id}/events?projectId=${encodeURIComponent(selectedProjectId() ?? "")}`, {
      withCredentials: true,
    });
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as LiveEvent;
      setLastEventAt(Date.now());
      if (event.type === "snapshot") {
        setLiveSteps(event.steps);
        if (!event.generating) {
          source.close();
          queryClient.invalidateQueries({ queryKey: aiAppsQuery().all });
        }
        return;
      }
      if (event.type === "step") {
        setLiveSteps((steps) => upsert(steps, event.step));
        return;
      }
      source.close();
      queryClient.invalidateQueries({ queryKey: aiAppsQuery().all });
    };
    return () => {
      source.close();
    };
  }, [generating, id, queryClient]);

  useEffect(() => {
    if (!generating) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
    };
  }, [generating]);

  useEffect(() => {
    if (wasGenerating.current && !generating) {
      setPreviewKey((key) => key + 1);
      setLiveSteps([]);
      queryClient.invalidateQueries({ queryKey: tokensQuery().all });
    }
    wasGenerating.current = generating;
  }, [generating, queryClient]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount, generating, liveSteps]);

  const send = useApiMutation({
    mutationFn: () => unwrap(api["ai-apps"][":id"].prompt.$post({ param: { id }, json: { prompt: prompt.trim() } })),
    invalidate: [aiAppsQuery().all],
    onSuccess: () => {
      setPrompt("");
      setLiveSteps([]);
    },
  });

  const respondMutation = useApiMutation({
    mutationFn: (body: Parameters<Respond>[0]) => unwrap(api["ai-apps"][":id"].respond.$post({ param: { id }, json: body })),
    invalidate: [aiAppsQuery().all],
    onSuccess: () => setLiveSteps([]),
  });

  const start = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].start.$post({ param: { id } })),
    invalidate: [aiAppsQuery().all, appsQuery().all],
    success: "App started",
  });

  if (error) {
    return <p role="alert" className="p-6 text-destructive">{error.message}</p>;
  }

  if (isLoading || !data) {
    return <Skeleton className="m-6 h-96" />;
  }

  const { app, messages, previewUrl, themes } = data;
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const respond: Respond = (body) => {
    respondMutation.mutate(body);
  };
  const focusComposer = () => {
    composer.current?.focus();
  };
  const lastLive = liveSteps[liveSteps.length - 1];
  let activity = "Thinking";
  if (lastLive && lastLive.type === "tool" && lastLive.status === "running") {
    activity = lastLive.title;
  }
  const idleSeconds = Math.max(0, Math.floor((now - lastEventAt) / 1000));
  let currentSteps = liveSteps;
  if (!currentSteps.length && app.aiStatus === "FAILED") {
    currentSteps = app.steps;
  }

  const submit = () => {
    if (!prompt.trim() || generating || send.isPending) {
      return;
    }
    send.mutate(undefined);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/builder" aria-label="Back to Builder">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="truncate font-semibold">{app.name}</span>
          <StatusBadge status={displayStatus(app.aiStatus, app.status)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewKey((key) => key + 1)}>
            <RefreshCw />
            Reload
          </Button>
          <Button size="sm" asChild>
            <a href={previewUrl ?? app.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              Open
            </a>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[420px_1fr]">
        <aside className="flex min-h-0 flex-col border-r">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!messages.length && !generating && (
              <p className="text-sm text-muted-foreground">Describe what to build. Your app can use a database, file storage, email and sign up.</p>
            )}
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div key={message.id} className="ml-auto max-w-[90%] bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                    {message.content}
                  </div>
                );
              }
              if (message.steps.length) {
                let handler: Respond | undefined = undefined;
                if (message.id === lastAssistantId && !generating) {
                  handler = respond;
                }
                return (
                  <StepsView
                    key={message.id}
                    steps={message.steps as Step[]}
                    themes={themes}
                    respond={handler}
                    pending={respondMutation.isPending}
                    onChangePlan={focusComposer}
                  />
                );
              }
              return <Markdown key={message.id} text={message.content} />;
            })}
            {(generating || app.aiStatus === "FAILED") && <StepsView steps={currentSteps} themes={themes} />}
            {generating && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {activity}
                {idleSeconds >= 3 && <span className="tabular-nums">{idleSeconds}s</span>}
              </p>
            )}
            {app.aiStatus === "FAILED" && app.aiError && <p className="text-sm text-destructive">{app.aiError}</p>}
            <div ref={chatEnd} />
          </div>
          <form
            className="space-y-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Textarea
              ref={composer}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Describe what to build or change"
              rows={3}
              disabled={generating}
            />
            <Button type="submit" className="w-full" disabled={!prompt.trim() || generating || send.isPending}>
              Send
            </Button>
            {tokens.data && (
              <p className="flex items-center justify-between text-xs text-muted-foreground">
                {tokens.data.freeBuildAvailable && <span>Your first build is free</span>}
                {!tokens.data.freeBuildAvailable && <span className="tabular-nums">{tokens.data.balance.toLocaleString("en-US")} tokens left</span>}
                <Link to="/tokens" className="underline-offset-4 hover:underline">Buy tokens</Link>
              </p>
            )}
          </form>
        </aside>

        <section className="min-h-0 bg-muted/30">
          {previewUrl && <iframe key={previewKey} src={previewUrl} title={`${app.name} preview`} className="h-full w-full border-0 bg-white" />}
          {!previewUrl && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>The app is not running.</p>
              <Button onClick={() => start.mutate(undefined)} disabled={start.isPending}>
                <Play />
                Start app
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
