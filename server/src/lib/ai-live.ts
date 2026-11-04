import { EventEmitter } from "node:events";

export type AiTextStep = { id: string; type: "text"; text: string };
export type AiToolStep = {
  id: string;
  type: "tool";
  tool: string;
  status: "running" | "done" | "error";
  title: string;
  detail: string | null;
  output: string | null;
};
export type AiStep = AiTextStep | AiToolStep;

export type AiLiveEvent =
  | { type: "step"; step: AiStep }
  | { type: "done"; status: "IDLE" | "FAILED"; error: string | null };

type Session = { steps: AiStep[]; emitter: EventEmitter };

const sessions = new Map<string, Session>();

export const startLiveSession = (appId: string) => {
  const session: Session = { steps: [], emitter: new EventEmitter() };
  session.emitter.setMaxListeners(50);
  sessions.set(appId, session);
  return session;
};

export const liveSession = (appId: string) => sessions.get(appId) ?? null;

export const upsertStep = (session: Session, step: AiStep) => {
  const index = session.steps.findIndex((item) => item.id === step.id);
  if (index === -1) {
    session.steps.push(step);
  } else {
    session.steps[index] = step;
  }
  session.emitter.emit("event", { type: "step", step } satisfies AiLiveEvent);
};

export const endLiveSession = (appId: string, status: "IDLE" | "FAILED", error: string | null) => {
  const session = sessions.get(appId);
  if (!session) {
    return;
  }
  session.emitter.emit("event", { type: "done", status, error } satisfies AiLiveEvent);
  sessions.delete(appId);
};

export const subscribeLive = (appId: string, listener: (event: AiLiveEvent) => void) => {
  const session = sessions.get(appId);
  if (!session) {
    return null;
  }
  session.emitter.on("event", listener);
  return () => {
    session.emitter.off("event", listener);
  };
};
