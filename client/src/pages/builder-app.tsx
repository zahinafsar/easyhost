import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Code,
  Download,
  Ellipsis,
  Eye,
  ImagePlus,
  Save,
  ListChecks,
  Palette,
  Database,
  ExternalLink,
  FileCode2,
  FilePen,
  FileText,
  HardDrive,
  Monitor,
  MousePointerClick,
  Package,
  Play,
  RefreshCw,
  Search,
  SendHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  Box,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Form,
  Grid,
  HStack,
  Icon,
  IconBadge,
  IconButton,
  Image,
  Input,
  Link,
  List,
  ListItem,
  Markdown,
  Pill,
  Pre,
  SegmentedControl,
  Skeleton,
  Spinner,
  Stack,
  StatusDot,
  Text,
  Textarea,
  Tooltip,
} from "@/components/ui";
import { Embed } from "@/components/ui/embed";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap, upload } from "@/lib/api";
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
type SelectedElement = { tag: string; selector: string; text: string; html: string; page: string };
type InspectorMessage =
  | { type: "easyhost:select"; element: SelectedElement }
  | { type: "easyhost:inspect-exit" }
  | { type: "easyhost:inspector-ready" };
type Device = "desktop" | "tablet" | "mobile";
type View = "preview" | "code";

const MAX_ELEMENTS = 5;
const MAX_ATTACHMENTS = 5;
const ASSET_DIR = "public/uploads/";
const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.avif,.svg,.ico";

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "max-w-full",
  tablet: "max-w-[820px]",
  mobile: "max-w-[390px]",
};

const isAssetPath = (path: string) => path.startsWith(ASSET_DIR);

const assetSrc = (appId: string, path: string) => {
  return `/api/ai-apps/${appId}/asset?path=${encodeURIComponent(path)}&projectId=${encodeURIComponent(selectedProjectId() ?? "")}`;
};

const AttachmentChip = ({ appId, path, onRemove }: { appId: string; path: string; onRemove?: () => void }) => (
  <HStack
    as="span"
    inline
    gap={2}
    title={`/uploads/${path.slice(ASSET_DIR.length)}`}
    className="max-w-full rounded-md border border-border bg-surface p-0.5 pr-2.5"
  >
    <Image src={assetSrc(appId, path)} alt="" rounded="full" fit="cover" className="size-6 shrink-0 bg-muted" />
    <Text as="span" size="xs" truncate>
      {path.slice(ASSET_DIR.length)}
    </Text>
    {onRemove && <IconButton icon={X} label="Remove image" size="xs" tooltip={false} onClick={onRemove} className="-mr-1 size-5" />}
  </HStack>
);

const elementLabel = (element: SelectedElement) => {
  if (element.text.length > 40) {
    return `${element.text.slice(0, 40)}...`;
  }
  if (element.text) {
    return element.text;
  }
  return element.selector.split(" > ").pop() ?? element.tag;
};

const ElementChip = ({ element, onRemove }: { element: SelectedElement; onRemove?: () => void }) => (
  <Pill title={element.selector} icon={MousePointerClick} size="sm" onRemove={onRemove} removeLabel="Remove element">
    <Text as="span" size="inherit" tone="muted" mono className="mr-1.5">
      {element.tag}
    </Text>
    {elementLabel(element)}
  </Pill>
);

type Respond = (body: { stepId: string; answers?: Record<string, string>; approve?: true; theme?: string }) => void;
type CardProps = { respond?: Respond; pending: boolean };
type LiveEvent =
  | { type: "snapshot"; steps: Step[]; generating: boolean }
  | { type: "step"; step: Step }
  | { type: "done"; status: string; error: string | null };

const TOOL_ICONS: Record<string, typeof FileCode2> = {
  write_file: FileCode2,
  edit_file: FilePen,
  read_file: FileText,
  grep: Search,
  delete_file: Trash2,
  run_sql: Database,
  install_packages: Package,
  read_logs: Terminal,
  connect_storage: HardDrive,
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
    return <Spinner size="sm" tone="accent" label="Running" />;
  }
  if (status === "error") {
    return <Icon icon={X} size="sm" tone="danger" label="Failed" />;
  }
  return <Icon icon={Check} size="sm" tone="success" label="Done" />;
};

const ToolStepView = ({ step }: { step: ToolStep }) => {
  const [open, setOpen] = useState<boolean | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const ToolIcon = TOOL_ICONS[step.tool] ?? FileCode2;
  const hasBody = !!step.detail || !!step.output;
  const expanded = hasBody && (open ?? step.status !== "done");

  useEffect(() => {
    if (step.status === "running" && detailRef.current) {
      detailRef.current.scrollTop = detailRef.current.scrollHeight;
    }
  }, [step.detail, step.status]);

  return (
    <Box className="overflow-hidden rounded-xl border border-border bg-surface">
      <Button
        type="button"
        variant="ghost"
        block
        disabled={!hasBody}
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        className="h-auto justify-start gap-2.5 rounded-none px-3 py-2 text-left text-foreground disabled:opacity-100"
      >
        <Icon icon={ToolIcon} size="sm" tone="muted" />
        <Text as="span" size="xs" mono truncate className="flex-1">
          {step.title}
        </Text>
        <StatusIcon status={step.status} />
        {hasBody && <Icon icon={ChevronDown} size="sm" tone="muted" className={cn("transition-transform", expanded && "rotate-180")} />}
      </Button>
      {expanded && (
        <Stack gap={2} className="border-t border-border p-2">
          {step.detail && (
            <Box ref={detailRef} className="scrollbar-thin max-h-64 overflow-auto rounded-lg">
              <Pre tone="terminal" className="rounded-lg p-3 text-[11px] leading-5">
                {step.detail}
              </Pre>
            </Box>
          )}
          {step.output && (
            <Pre wrap className={cn("max-h-48 overflow-auto rounded-lg p-3 text-[11px] leading-5", step.status === "error" && "text-destructive")}>
              {step.output}
            </Pre>
          )}
        </Stack>
      )}
    </Box>
  );
};

const CardShell = ({ icon, title, children }: { icon: typeof FileCode2; title: string; children: React.ReactNode }) => (
  <Card className="gap-4 rounded-2xl p-4">
    <HStack gap={3}>
      <IconBadge icon={icon} tone="success" size="sm" />
      <Text weight="medium">{title}</Text>
    </HStack>
    {children}
  </Card>
);

const QuestionsCard = ({ step, respond, pending }: { step: QuestionsStep } & CardProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  if (step.answers) {
    const given = step.answers;
    return (
      <CardShell icon={CircleHelp} title="Questions">
        <List variant="divided">
          {step.questions.map((question) => (
            <ListItem key={question.id} className="py-2 first:pt-0 last:pb-0">
              <Text size="sm" tone="muted">
                {question.text}
              </Text>
              <Text weight="medium">{given[question.id]}</Text>
            </ListItem>
          ))}
        </List>
      </CardShell>
    );
  }
  return (
    <CardShell icon={CircleHelp} title="A few questions first">
      <Stack gap={5}>
        {step.questions.map((question) => (
          <Stack key={question.id} gap={2}>
            <Text>{question.text}</Text>
            <HStack wrap gap={2}>
              {question.options.map((option) => {
                let variant: "default" | "secondary" = "secondary";
                if (answers[question.id] === option) {
                  variant = "default";
                }
                return (
                  <Button
                    key={option}
                    type="button"
                    size="xs"
                    variant={variant}
                    disabled={!respond || pending}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                  >
                    {option}
                  </Button>
                );
              })}
            </HStack>
            <Input
              placeholder="Or type your own answer"
              disabled={!respond || pending}
              value={question.options.includes(answers[question.id] ?? "") ? "" : (answers[question.id] ?? "")}
              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
              className="h-9"
            />
          </Stack>
        ))}
      </Stack>
      <HStack>
        <Button
          size="sm"
          loading={pending && !!respond}
          disabled={!respond || pending || !step.questions.every((question) => answers[question.id]?.trim())}
          onClick={() => respond?.({ stepId: step.id, answers })}
        >
          Submit answers
        </Button>
      </HStack>
    </CardShell>
  );
};

const PlanCard = ({ step, respond, pending, onChange }: { step: PlanStep; onChange: () => void } & CardProps) => (
  <CardShell icon={ListChecks} title="Plan">
    <Text>{step.summary}</Text>
    <List variant="check" gap={2}>
      {step.items.map((item) => (
        <ListItem key={item} icon={Check}>
          {item}
        </ListItem>
      ))}
    </List>
    {step.status === "approved" && (
      <HStack>
        <Pill tone="success" size="sm" icon={Check}>
          Approved
        </Pill>
      </HStack>
    )}
    {step.status === "pending" && respond && (
      <HStack gap={2}>
        <Button size="sm" disabled={pending} onClick={() => respond({ stepId: step.id, approve: true })}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={onChange}>
          Change something
        </Button>
      </HStack>
    )}
  </CardShell>
);

const ThemePreview = ({ theme, selected, disabled, onPick }: { theme: Theme; selected: boolean; disabled: boolean; onPick: () => void }) => (
  <Button
    type="button"
    variant="secondary"
    disabled={disabled}
    onClick={onPick}
    aria-pressed={selected}
    className={cn(
      "h-auto flex-col items-stretch gap-0 overflow-hidden rounded-xl p-0 text-left font-normal whitespace-normal disabled:opacity-100",
      selected && "border-accent-green ring-2 ring-accent-green/30",
    )}
  >
    <Text as="span" size="xs" weight="medium" truncate className="border-b border-border px-2.5 py-1.5">
      {theme.name}
    </Text>
    <Stack gap={2} className="flex-1 p-2.5" style={{ background: theme.colors.background, color: theme.colors.foreground, fontFamily: `"${theme.font}", sans-serif` }}>
      <HStack gap={1}>
        {[theme.colors.primary, theme.colors.surface, theme.colors.muted, theme.colors.border].map((color) => (
          <Box key={color} as="span" className="size-3 border border-black/10" style={{ background: color, borderRadius: theme.radius }} />
        ))}
      </HStack>
      <Text as="span" size="inherit" tone="inherit" weight="semibold" className="text-lg leading-none">
        Aa
      </Text>
      <Box
        as="span"
        className="self-start px-2 py-0.5 text-[10px] font-medium"
        style={{ background: theme.colors.primary, color: theme.colors.primaryForeground, borderRadius: theme.radius }}
      >
        Button
      </Box>
    </Stack>
    <Text as="span" size="2xs" tone="muted" truncate className="border-t border-border px-2.5 py-1.5">
      {theme.font}
    </Text>
  </Button>
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

  let title = "Pick a theme";
  if (step.chosen) {
    title = "Theme";
  }

  return (
    <CardShell icon={Palette} title={title}>
      <Grid cols="3-fixed" gap={2}>
        {themes.map((theme) => (
          <ThemePreview
            key={theme.id}
            theme={theme}
            selected={step.chosen === theme.id}
            disabled={!!step.chosen || !respond || pending}
            onPick={() => respond?.({ stepId: step.id, theme: theme.id })}
          />
        ))}
      </Grid>
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
  <Stack gap={2}>
    {steps.map((step) => {
      if (step.type === "text") {
        return <Markdown key={step.id}>{step.text}</Markdown>;
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
  </Stack>
);

const MonacoEditor = lazy(() => import("@/components/monaco-editor").then((module) => ({ default: module.MonacoEditor })));

const pickDefaultFile = (files: { path: string }[]) => {
  const preferred = ["public/index.html", "server.js"].find((path) => files.some((file) => file.path === path));
  if (preferred) {
    return preferred;
  }
  return files[0]?.path ?? "";
};

const CodeEditor = ({
  appId,
  files,
  readOnly,
  onSaved,
}: {
  appId: string;
  files: { path: string; size: number }[];
  readOnly: boolean;
  onSaved: () => void;
}) => {
  const [path, setPath] = useState(() => pickDefaultFile(files));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const asset = isAssetPath(path);
  const file = useQuery({ ...aiAppsQuery().file(appId, path), enabled: !!path && !asset });

  useEffect(() => {
    if (readOnly) {
      setDrafts({});
    }
  }, [readOnly]);

  const saved = file.data?.content ?? "";
  const draft = drafts[path];
  const value = draft ?? saved;
  const dirty = draft !== undefined && draft !== saved;

  const save = useApiMutation({
    mutationFn: (body: { path: string; content: string }) => unwrap(api["ai-apps"][":id"].file.$put({ param: { id: appId }, json: body })),
    invalidate: [aiAppsQuery().all],
    onSuccess: ({ path: savedPath }) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[savedPath];
        return next;
      });
      toast.success(`Saved ${savedPath}`);
      onSaved();
    },
  });

  const submit = () => {
    if (!dirty || readOnly || save.isPending) {
      return;
    }
    save.mutate({ path, content: value });
  };

  const isDirty = (filePath: string) => {
    return drafts[filePath] !== undefined && !(filePath === path && drafts[filePath] === saved);
  };

  return (
    <Stack direction="row" gap={0} className="h-full min-h-0">
      <Stack as="nav" gap={1} aria-label="Files" className="scrollbar-thin w-56 shrink-0 overflow-y-auto border-r border-border p-2">
        {files.map((item) => (
          <Button
            key={item.path}
            type="button"
            variant="ghost"
            size="xs"
            block
            onClick={() => setPath(item.path)}
            aria-current={item.path === path || undefined}
            className={cn("justify-start rounded-lg px-2.5 font-mono font-normal", item.path === path && "bg-accent font-medium text-foreground")}
          >
            <Text as="span" size="inherit" tone="inherit" truncate className="flex-1 text-left">
              {item.path}
            </Text>
            {isDirty(item.path) && <StatusDot tone="success" label="Unsaved changes" />}
          </Button>
        ))}
        {!files.length && (
          <Text size="xs" tone="muted" className="px-2.5 py-1.5">
            No files yet.
          </Text>
        )}
      </Stack>
      <Stack gap={0} className="min-w-0 flex-1">
        <HStack justify="between" gap={2} className="h-12 shrink-0 border-b border-border px-3">
          <Text as="span" size="xs" tone="muted" mono truncate>
            {path}
          </Text>
          {asset && (
            <Pill tone="muted" size="sm" className="shrink-0">
              Uploaded image, read only
            </Pill>
          )}
          {!asset && (
            <HStack gap={2} className="shrink-0">
              {readOnly && (
                <Pill tone="muted" size="sm">
                  Read only while the AI is working
                </Pill>
              )}
              {dirty && !readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDrafts((current) => {
                      const next = { ...current };
                      delete next[path];
                      return next;
                    })
                  }
                >
                  Discard
                </Button>
              )}
              <Button size="sm" onClick={submit} loading={save.isPending} disabled={!dirty || readOnly}>
                {!save.isPending && <Save />}
                Save
              </Button>
            </HStack>
          )}
        </HStack>
        {asset && (
          <Stack align="center" justify="center" gap={3} className="min-h-0 flex-1 overflow-auto bg-surface-2 p-6">
            <Image src={assetSrc(appId, path)} alt={path} rounded="lg" fit="contain" className="max-h-[70%] border border-border bg-surface" />
            <Text size="xs" tone="muted" mono>
              /uploads/{path.slice(ASSET_DIR.length)}
            </Text>
          </Stack>
        )}
        {file.isLoading && <Skeleton className="m-3 flex-1 rounded-xl" />}
        {file.error && (
          <Alert variant="danger" className="m-3 w-auto">
            {file.error.message}
          </Alert>
        )}
        {file.data && (
          <Box className="min-h-0 flex-1">
            <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
              <MonacoEditor
                path={path}
                value={value}
                readOnly={readOnly}
                onChange={(next) => setDrafts((current) => ({ ...current, [path]: next }))}
                onSave={submit}
              />
            </Suspense>
          </Box>
        )}
      </Stack>
    </Stack>
  );
};

export const BuilderAppPage = () => {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(aiAppsQuery().detail(id));
  const [prompt, setPrompt] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [inspectorReady, setInspectorReady] = useState(false);
  const [elements, setElements] = useState<SelectedElement[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLIFrameElement>(null);
  const [liveSteps, setLiveSteps] = useState<Step[]>([]);
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const wasGenerating = useRef(false);
  const chatEnd = useRef<HTMLElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const tokens = useQuery(tokensQuery().summary());

  const generating = data?.app.aiStatus === "GENERATING";
  const messageCount = data?.messages.length ?? 0;
  const previewUrl = data?.previewUrl ?? null;
  let previewOrigin: string | null = null;
  if (previewUrl) {
    previewOrigin = new URL(previewUrl).origin;
  }

  useEffect(() => {
    const frame = preview.current?.contentWindow;
    if (!frame || !previewOrigin) {
      return;
    }
    frame.postMessage({ type: "easyhost:inspect", enabled: selecting }, previewOrigin);
  }, [selecting, previewOrigin]);

  useEffect(() => {
    if (!previewOrigin) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== previewOrigin || event.source !== preview.current?.contentWindow) {
        return;
      }
      const message = event.data as InspectorMessage;
      if (message?.type === "easyhost:inspector-ready") {
        setInspectorReady(true);
        preview.current?.contentWindow?.postMessage({ type: "easyhost:inspect", enabled: selecting }, previewOrigin);
        return;
      }
      if (message?.type === "easyhost:inspect-exit") {
        setSelecting(false);
        return;
      }
      if (message?.type === "easyhost:select") {
        setSelecting(false);
        setElements((current) => {
          if (current.some((item) => item.selector === message.element.selector && item.page === message.element.page)) {
            return current;
          }
          return [...current, message.element].slice(-MAX_ELEMENTS);
        });
        composer.current?.focus();
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [previewOrigin, selecting]);

  useEffect(() => {
    if (!selecting) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelecting(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selecting]);

  useEffect(() => {
    if (generating) {
      setSelecting(false);
    }
  }, [generating]);

  useEffect(() => {
    setInspectorReady(false);
  }, [previewKey, previewUrl]);

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
    mutationFn: () => unwrap(api["ai-apps"][":id"].prompt.$post({ param: { id }, json: { prompt: prompt.trim(), elements, attachments } })),
    invalidate: [aiAppsQuery().all],
    onSuccess: () => {
      setPrompt("");
      setElements([]);
      setAttachments([]);
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
    return (
      <Box className="p-6">
        <Alert variant="danger">{error.message}</Alert>
      </Box>
    );
  }

  if (isLoading || !data) {
    return (
      <Box className="h-full p-3">
        <Skeleton className="h-full rounded-3xl" />
      </Box>
    );
  }

  const { app, messages, themes, files } = data;
  const exportUrl = `/api/ai-apps/${id}/export?projectId=${encodeURIComponent(selectedProjectId() ?? "")}`;
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
  let view: View = "preview";
  if (showCode) {
    view = "code";
  }
  let urlTone: "success" | "muted" = "muted";
  if (previewUrl) {
    urlTone = "success";
  }
  let selectVariant: "default" | "secondary" = "secondary";
  let selectLabel = "Select element";
  if (selecting) {
    selectVariant = "default";
    selectLabel = "Click an element";
  }

  const attachImages = async (list: File[]) => {
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      toast.error(`Attach at most ${MAX_ATTACHMENTS} images per message`);
      return;
    }
    if (list.length > room) {
      toast.error(`Only the first ${room} images were attached`);
    }
    await Promise.all(
      list.slice(0, room).map(async (item) => {
        const form = new FormData();
        form.append("file", item);
        setUploading((count) => count + 1);
        try {
          const result = (await upload(`/api/ai-apps/${id}/assets`, form)) as { asset: { path: string } };
          setAttachments((current) => [...current, result.asset.path].slice(0, MAX_ATTACHMENTS));
        } catch (uploadError) {
          toast.error((uploadError as Error).message);
        } finally {
          setUploading((count) => count - 1);
        }
      }),
    );
    queryClient.invalidateQueries({ queryKey: aiAppsQuery().all });
  };

  const submit = () => {
    if (!prompt.trim() || generating || send.isPending || uploading > 0) {
      return;
    }
    send.mutate(undefined);
  };

  const toggleSelecting = () => {
    if (!selecting && !inspectorReady) {
      toast.error("This app runs on an older runtime. Stop and start the app, then try again.");
      return;
    }
    setSelecting(!selecting);
  };

  const changeView = (next: View) => {
    setSelecting(false);
    setShowCode(next === "code");
  };

  return (
    <Stack gap={3} className="h-full bg-background p-2 md:p-3">
      <HStack as="header" justify="between" gap={3} className="h-14 shrink-0 rounded-md border border-border bg-surface px-2">
        <HStack gap={2} className="min-w-0">
          <Tooltip content="Back to Builder">
            <Button variant="secondary" size="icon-sm" asChild>
              <Link to="/builder" variant="plain" inline={false} aria-label="Back to Builder">
                <ChevronLeft />
              </Link>
            </Button>
          </Tooltip>
          <Text weight="medium" truncate className="tracking-[-0.01em]">
            {app.name}
          </Text>
          <StatusBadge status={displayStatus(app.aiStatus, app.status)} />
        </HStack>
        <HStack gap={2} className="shrink-0">
          <SegmentedControl<View>
            size="sm"
            aria-label="View"
            value={view}
            onValueChange={changeView}
            options={[
              { value: "preview", label: "Preview", icon: Eye },
              { value: "code", label: "Code", icon: Code },
            ]}
            className="hidden sm:inline-flex"
          />
          <Button variant={selectVariant} size="sm" disabled={!previewUrl || generating || showCode} onClick={toggleSelecting} aria-pressed={selecting}>
            <MousePointerClick />
            {selectLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon-sm" aria-label="More actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setSelecting(false);
                  setShowCode(!showCode);
                }}
              >
                {showCode && <Eye />}
                {!showCode && <Code />}
                {showCode ? "Preview" : "Code"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={exportUrl} download={`${app.slug}.zip`} external={false} variant="plain" inline={false}>
                  <Download />
                  Export
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPreviewKey((key) => key + 1)}>
                <RefreshCw />
                Reload
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={previewUrl ?? app.url} external variant="plain" inline={false}>
                  <ExternalLink />
                  Open
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HStack>
      </HStack>

      <Grid cols="sidebar-left" gap={3} className="min-h-0 flex-1 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Stack as="aside" gap={0} className="min-h-0 overflow-hidden rounded-3xl border border-border bg-surface">
          <Stack gap={4} className="scrollbar-thin flex-1 overflow-y-auto p-4">
            {!messages.length && !generating && (
              <EmptyState
                icon={Sparkles}
                size="sm"
                title="Describe what to build"
                description="Your app can use a database, file storage and sign up."
              />
            )}
            {messages.map((message) => {
              if (message.role === "user") {
                const tagged = message.elements as SelectedElement[];
                const images = message.attachments as string[];
                return (
                  <Stack key={message.id} align="end" gap={1} className="ml-auto max-w-[90%]">
                    {images.length > 0 && (
                      <HStack wrap justify="end" gap={1}>
                        {images.map((path) => (
                          <AttachmentChip key={path} appId={app.id} path={path} />
                        ))}
                      </HStack>
                    )}
                    {tagged.length > 0 && (
                      <HStack wrap justify="end" gap={1}>
                        {tagged.map((element) => (
                          <ElementChip key={`${element.page}${element.selector}`} element={element} />
                        ))}
                      </HStack>
                    )}
                    <Text wrap="pre" tone="inverse" className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5">
                      {message.content}
                    </Text>
                  </Stack>
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
              return <Markdown key={message.id}>{message.content}</Markdown>;
            })}
            {(generating || app.aiStatus === "FAILED") && <StepsView steps={currentSteps} themes={themes} />}
            {generating && (
              <HStack gap={2}>
                <Spinner size="sm" tone="accent" />
                <Text as="span" size="xs" tone="muted" truncate>
                  {activity}
                </Text>
                {idleSeconds >= 3 && (
                  <Text as="span" size="xs" tone="subtle" tabular>
                    {idleSeconds}s
                  </Text>
                )}
              </HStack>
            )}
            {app.aiStatus === "FAILED" && app.aiError && <Alert variant="danger">{app.aiError}</Alert>}
            <Box ref={chatEnd} />
          </Stack>
          <Form gap="sm" onSubmit={submit} className="shrink-0 border-t border-border p-3">
            {(attachments.length > 0 || uploading > 0) && (
              <HStack wrap gap={1}>
                {attachments.map((path) => (
                  <AttachmentChip
                    key={path}
                    appId={app.id}
                    path={path}
                    onRemove={() => setAttachments((current) => current.filter((item) => item !== path))}
                  />
                ))}
                {uploading > 0 && (
                  <Pill tone="muted" size="sm" icon={Spinner}>
                    Uploading
                  </Pill>
                )}
              </HStack>
            )}
            {elements.length > 0 && (
              <HStack wrap gap={1}>
                {elements.map((element) => (
                  <ElementChip
                    key={`${element.page}${element.selector}`}
                    element={element}
                    onRemove={() => setElements((current) => current.filter((item) => item !== element))}
                  />
                ))}
              </HStack>
            )}
            <Stack gap={2} className="rounded-2xl border border-input bg-surface-2 p-2 focus-within:border-accent-green/60 focus-within:ring-[3px] focus-within:ring-ring/40">
              <Textarea
                ref={composer}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onPaste={(event) => {
                  const pasted = [...event.clipboardData.files].filter((item) => item.type.startsWith("image/"));
                  if (pasted.length) {
                    event.preventDefault();
                    attachImages(pasted);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                aria-label="Message"
                placeholder="Describe what to build or change"
                rows={3}
                disabled={generating}
                className="max-h-60 min-h-16 resize-none border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Input
                ref={imageInput}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  const chosen = [...(event.target.files ?? [])];
                  event.target.value = "";
                  if (chosen.length) {
                    attachImages(chosen);
                  }
                }}
              />
              <HStack justify="between" gap={2}>
                <IconButton
                  type="button"
                  icon={ImagePlus}
                  label="Attach images to use as assets"
                  disabled={generating || attachments.length >= MAX_ATTACHMENTS}
                  onClick={() => imageInput.current?.click()}
                />
                <Button type="submit" size="sm" disabled={!prompt.trim() || generating || send.isPending || uploading > 0}>
                  Send
                  <SendHorizontal />
                </Button>
              </HStack>
            </Stack>
            {tokens.data && (
              <HStack justify="between" gap={2}>
                {tokens.data.freeBuildAvailable && (
                  <Text as="span" size="xs" tone="muted">
                    Your first build is free
                  </Text>
                )}
                {!tokens.data.freeBuildAvailable && (
                  <Text as="span" size="xs" tone="muted" tabular>
                    {tokens.data.balance.toLocaleString("en-US")} tokens left
                  </Text>
                )}
                <Link to="/subscription" variant="muted" className="text-xs">
                  Get more tokens
                </Link>
              </HStack>
            )}
          </Form>
        </Stack>

        <Box as="section" className="min-h-[60vh] overflow-hidden rounded-3xl border border-border bg-surface lg:min-h-0">
          {showCode && (
            <CodeEditor
              key={app.id}
              appId={app.id}
              files={files}
              readOnly={generating}
              onSaved={() => setPreviewKey((key) => key + 1)}
            />
          )}
          <Stack gap={0} className={cn("h-full", showCode && "hidden")}>
            <HStack justify="between" gap={2} className="h-14 shrink-0 border-b border-border px-3">
              <SegmentedControl<Device>
                size="sm"
                aria-label="Device"
                value={device}
                onValueChange={setDevice}
                options={[
                  { value: "desktop", label: "Desktop", icon: Monitor },
                  { value: "tablet", label: "Tablet", icon: Tablet },
                  { value: "mobile", label: "Mobile", icon: Smartphone },
                ]}
              />
              <HStack gap={2} className="hidden min-w-0 flex-1 justify-center md:flex">
                <HStack gap={2} className="h-[38px] max-w-md min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3">
                  <StatusDot tone={urlTone} />
                  <Text as="span" size="xs" tone="muted" mono truncate>
                    {previewUrl ?? app.url}
                  </Text>
                </HStack>
              </HStack>
              <HStack gap={1} className="shrink-0">
                <IconButton icon={RefreshCw} label="Reload" onClick={() => setPreviewKey((key) => key + 1)} />
                <Tooltip content="Open">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link href={previewUrl ?? app.url} external variant="plain" inline={false} aria-label="Open">
                      <ExternalLink />
                    </Link>
                  </Button>
                </Tooltip>
              </HStack>
            </HStack>
            <Box className={cn("min-h-0 flex-1 bg-surface-2", device !== "desktop" && "p-4")}>
              {previewUrl && (
                <Box
                  className={cn(
                    "mx-auto h-full w-full overflow-hidden transition-[max-width] duration-300",
                    DEVICE_WIDTHS[device],
                    device !== "desktop" && "rounded-2xl border border-border",
                  )}
                >
                  <Embed ref={preview} key={previewKey} src={previewUrl} title={`${app.name} preview`} className="bg-white" />
                </Box>
              )}
              {!previewUrl && (
                <EmptyState
                  icon={Play}
                  title="The app is not running."
                  className="h-full"
                  action={
                    <Button onClick={() => start.mutate(undefined)} loading={start.isPending}>
                      {!start.isPending && <Play />}
                      Start app
                    </Button>
                  }
                />
              )}
            </Box>
          </Stack>
        </Box>
      </Grid>
    </Stack>
  );
};
