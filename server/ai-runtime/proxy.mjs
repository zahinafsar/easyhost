import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

const PUBLIC_PORT = Number(requireEnv("PORT"));
const DASHBOARD_ORIGIN = requireEnv("EASYHOST_DASHBOARD_ORIGIN");
const APP_PORT = 3001;
const APP_HOST = "127.0.0.1";
const INSPECTOR_PATH = "/__easyhost/inspector.js";
const INSPECTOR_TAG = `<script src="${INSPECTOR_PATH}" defer></script>`;
const READY_TIMEOUT_MS = 20_000;

const inspectorSource = `(() => {
  if (window.parent === window || window.__easyhostInspector) {
    return;
  }
  window.__easyhostInspector = true;
  const ORIGIN = ${JSON.stringify(DASHBOARD_ORIGIN)};
  let active = false;
  let current = null;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #2563eb;background:rgba(37,99,235,0.08);display:none;box-sizing:border-box;";
  const label = document.createElement("div");
  label.style.cssText = "position:absolute;left:-2px;top:-22px;padding:2px 6px;font:500 11px/16px ui-sans-serif,system-ui,sans-serif;color:#fff;background:#2563eb;white-space:nowrap;";
  box.appendChild(label);
  const send = (message) => {
    window.parent.postMessage(message, ORIGIN);
  };
  const clip = (value, max) => {
    if (value.length > max) {
      return value.slice(0, max) + "...";
    }
    return value;
  };
  const selectorFor = (element) => {
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && node !== document.documentElement && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(part + "#" + CSS.escape(node.id));
        break;
      }
      const classes = [...node.classList].slice(0, 2).map((name) => "." + CSS.escape(name)).join("");
      part += classes;
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((child) => child.tagName === node.tagName);
        if (same.length > 1) {
          part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
        }
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  };
  const describe = (element) => ({
    tag: element.tagName.toLowerCase(),
    selector: clip(selectorFor(element), 300),
    text: clip((element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim(), 200),
    html: clip(element.outerHTML.replace(/\\s+/g, " "), 800),
    page: location.pathname,
  });
  const highlight = (element) => {
    current = element;
    if (!element) {
      box.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";
    label.textContent = element.tagName.toLowerCase();
    if (rect.top < 24) {
      label.style.top = "0px";
    } else {
      label.style.top = "-22px";
    }
  };
  const setActive = (value) => {
    active = value;
    if (active) {
      if (!box.isConnected) {
        document.documentElement.appendChild(box);
      }
      document.documentElement.style.cursor = "crosshair";
      return;
    }
    highlight(null);
    document.documentElement.style.cursor = "";
  };
  const block = (event) => {
    if (!active) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("mousemove", (event) => {
    if (!active) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target !== current) {
      highlight(target);
    }
  }, true);
  document.addEventListener("mouseleave", () => {
    if (active) {
      highlight(null);
    }
  });
  document.addEventListener("scroll", () => {
    if (active && current) {
      highlight(current);
    }
  }, true);
  ["mousedown", "mouseup", "pointerdown", "pointerup", "dblclick", "submit"].forEach((type) => {
    document.addEventListener(type, block, true);
  });
  document.addEventListener("click", (event) => {
    if (!active) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.target;
    if (target instanceof Element) {
      send({ type: "easyhost:select", element: describe(target) });
    }
    setActive(false);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (active && event.key === "Escape") {
      event.preventDefault();
      setActive(false);
      send({ type: "easyhost:inspect-exit" });
    }
  }, true);
  window.addEventListener("message", (event) => {
    if (event.origin !== ORIGIN || event.source !== window.parent) {
      return;
    }
    if (event.data && event.data.type === "easyhost:inspect") {
      setActive(!!event.data.enabled);
    }
  });
  send({ type: "easyhost:inspector-ready" });
})();
`;

const child = spawn("node", ["--watch", "server.js"], {
  cwd: "/srv/app",
  stdio: "inherit",
  env: { ...process.env, PORT: String(APP_PORT) },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => {
    child.kill(signal);
  });
});

let upstreamUp = false;

const canConnect = () => {
  return new Promise((resolve) => {
    const socket = net.connect(APP_PORT, APP_HOST);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
};

const waitForUpstream = async () => {
  if (upstreamUp) {
    return true;
  }
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await canConnect()) {
      upstreamUp = true;
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
};

const injectInspector = (html) => {
  const head = html.search(/<\/head>/i);
  if (head !== -1) {
    return html.slice(0, head) + INSPECTOR_TAG + html.slice(head);
  }
  const body = html.search(/<\/body>/i);
  if (body !== -1) {
    return html.slice(0, body) + INSPECTOR_TAG + html.slice(body);
  }
  return html + INSPECTOR_TAG;
};

const isInjectable = (req, upstream) => {
  const type = String(upstream.headers["content-type"] ?? "");
  return (
    req.method !== "HEAD" &&
    upstream.statusCode !== 204 &&
    upstream.statusCode !== 304 &&
    type.includes("text/html") &&
    !upstream.headers["content-encoding"]
  );
};

const badGateway = (res) => {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
  res.end("The app is not responding. It may still be starting or it crashed, check the logs.");
};

const server = http.createServer(async (req, res) => {
  if (req.url === INSPECTOR_PATH) {
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache" });
    res.end(inspectorSource);
    return;
  }

  if (!(await waitForUpstream())) {
    badGateway(res);
    return;
  }

  const headers = { ...req.headers };
  delete headers["accept-encoding"];
  const proxyReq = http.request({ host: APP_HOST, port: APP_PORT, method: req.method, path: req.url, headers }, (upstream) => {
    if (!isInjectable(req, upstream)) {
      res.writeHead(upstream.statusCode ?? 502, upstream.rawHeaders);
      upstream.pipe(res);
      return;
    }
    const chunks = [];
    upstream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    upstream.on("end", () => {
      const body = Buffer.from(injectInspector(Buffer.concat(chunks).toString("utf8")), "utf8");
      const outHeaders = { ...upstream.headers };
      delete outHeaders["transfer-encoding"];
      outHeaders["content-length"] = String(body.length);
      res.writeHead(upstream.statusCode ?? 200, outHeaders);
      res.end(body);
    });
    upstream.on("error", () => {
      badGateway(res);
    });
  });

  proxyReq.on("error", (error) => {
    if (error.code === "ECONNREFUSED") {
      upstreamUp = false;
    }
    badGateway(res);
  });
  req.pipe(proxyReq);
});

server.on("upgrade", async (req, socket, head) => {
  if (!(await waitForUpstream())) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(APP_PORT, APP_HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let index = 0; index < req.rawHeaders.length; index += 2) {
      lines.push(`${req.rawHeaders[index]}: ${req.rawHeaders[index + 1]}`);
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head.length) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => {
    socket.destroy();
  });
  socket.on("error", () => {
    upstream.destroy();
  });
});

server.listen(PUBLIC_PORT, "0.0.0.0");
