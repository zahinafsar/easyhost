import pc from "picocolors";
import { json, request, type Domain } from "../lib/api.js";
import { resolveAppDetail, type ProjectOption } from "../lib/project.js";
import { fail, log, output } from "../lib/ui.js";

const findDomain = (domains: Domain[], hostname: string) => {
  const domain = domains.find((item) => item.hostname === hostname.toLowerCase());
  if (!domain) {
    return fail(`${hostname} is not connected to this project. See \`ezhst domains list\`.`);
  }
  return domain;
};

export const listDomains = async (options: ProjectOption) => {
  const { domains, dnsTarget } = await resolveAppDetail(options);
  output({ domains, dnsTarget }, () => {
    if (!domains.length) {
      log.info("No custom domains yet. Add one with `ezhst domains add <hostname>`.");
    }
    for (const domain of domains) {
      log.info(`${pc.bold(domain.hostname.padEnd(32))} ${domain.status}`);
      if (domain.error) {
        log.warn(`  ${domain.error}`);
      }
    }
    log.dim(`\nDNS: CNAME to ${dnsTarget.cname}, or for a root domain an A record to ${dnsTarget.ip}.`);
  });
};

export const addDomain = async (hostname: string, options: ProjectOption) => {
  const { app, dnsTarget } = await resolveAppDetail(options);
  const { domain } = await request<{ domain: Domain }>(`/apps/${app.id}/domains`, json("POST", { hostname }));
  output({ domain, dnsTarget }, () => {
    log.success(`Added ${domain.hostname}.`);
    log.info(`Create a CNAME record for ${domain.hostname} pointing to ${dnsTarget.cname}`);
    log.info(`(for a root domain, an A record pointing to ${dnsTarget.ip}), then run \`ezhst domains verify ${domain.hostname}\`.`);
  });
};

export const verifyDomain = async (hostname: string, options: ProjectOption) => {
  const { app, domains } = await resolveAppDetail(options);
  const domain = findDomain(domains, hostname);
  const result = await request<{ domain: Domain }>(`/apps/${app.id}/domains/${domain.id}/verify`, { method: "POST" });
  output(result, () => log.success(`${result.domain.hostname} is ${result.domain.status.toLowerCase()}`));
};

export const removeDomain = async (hostname: string, options: ProjectOption) => {
  const { app, domains } = await resolveAppDetail(options);
  const domain = findDomain(domains, hostname);
  const result = await request<{ message: string }>(`/apps/${app.id}/domains/${domain.id}`, { method: "DELETE" });
  output(result, () => log.success(`Removed ${domain.hostname}`));
};
