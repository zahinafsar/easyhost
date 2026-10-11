import { json, request, type Schedule } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { confirmed, fail, log, output } from "../lib/ui.js";

type ScheduleOptions = ProjectOption & { name?: string; url?: string; every?: string; method?: string; headers?: string; body?: string; paused?: boolean };

const overview = async (options: ProjectOption) => {
  await resolveProject(options);
  return request<{ schedules: Schedule[]; limit: number }>("/schedules");
};

const findSchedule = async (id: string, options: ProjectOption) => {
  const { schedules } = await overview(options);
  const schedule = schedules.find((item) => item.id === id);
  return schedule ?? fail("Schedule not found in this project");
};

const payload = (name: string, options: ScheduleOptions, current?: Schedule) => {
  const url = options.url ?? current?.url;
  const intervalMinutes = options.every === undefined ? current?.intervalMinutes : Number(options.every);
  if (!url || intervalMinutes === undefined) {
    return fail("Pass --url <url> and --every <minutes>.");
  }
  let headers: unknown = current?.headers ?? {};
  if (options.headers !== undefined) {
    try {
      headers = JSON.parse(options.headers);
    } catch {
      return fail("--headers must be a JSON object with string values");
    }
  }
  if (!headers || typeof headers !== "object" || Array.isArray(headers) || Object.values(headers).some((value) => typeof value !== "string")) {
    return fail("--headers must be a JSON object with string values");
  }
  const method = (options.method ?? current?.method ?? "GET").toUpperCase();
  return { name, url, intervalMinutes, method, headers, body: options.body ?? current?.body ?? null, enabled: options.paused ? false : current?.enabled ?? true };
};

export const listSchedules = async (options: ProjectOption) => {
  const data = await overview(options);
  output(data, () => {
    log.info(`${data.schedules.length}/${data.limit} schedules`);
    for (const schedule of data.schedules) {
      log.info(`${schedule.id} ${schedule.enabled ? "ACTIVE" : "PAUSED"} every ${schedule.intervalMinutes}m ${schedule.name}: ${schedule.method} ${schedule.url}`);
    }
  });
};

export const createSchedule = async (name: string, options: ScheduleOptions) => {
  await resolveProject(options);
  const result = await request<{ schedule: Schedule }>("/schedules", json("POST", payload(name, options)));
  output(result, () => log.success(`Created schedule ${result.schedule.name} (${result.schedule.id})`));
};

export const updateSchedule = async (id: string, options: ScheduleOptions) => {
  const current = await findSchedule(id, options);
  const result = await request<{ message: string }>(`/schedules/${id}`, json("PUT", payload(options.name ?? current.name, options, current)));
  output(result, () => log.success(result.message));
};

export const setScheduleState = async (id: string, enabled: boolean, options: ProjectOption) => {
  await resolveProject(options);
  const result = await request<{ message: string }>(`/schedules/${id}`, json("PATCH", { enabled }));
  output(result, () => log.success(result.message));
};

export const scheduleLogs = async (id: string, options: ProjectOption) => {
  const schedule = await findSchedule(id, options);
  output({ runs: schedule.runs }, () => {
    for (const run of schedule.runs) {
      log.info(`${run.startedAt} ${run.error ?? `HTTP ${run.statusCode}`} ${run.durationMs}ms`);
    }
    if (!schedule.runs.length) {
      log.info("No runs yet.");
    }
  });
};

export const deleteSchedule = async (id: string, options: ProjectOption & { yes?: boolean }) => {
  await resolveProject(options);
  confirmed(options.yes, "Deleting this schedule stops future calls and removes its run history.");
  const result = await request<{ message: string }>(`/schedules/${id}`, { method: "DELETE" });
  output(result, () => log.success(result.message));
};
