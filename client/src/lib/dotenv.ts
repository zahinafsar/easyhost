export type EnvRow = { key: string; value: string };

const KEY_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/;

const unescapeDouble = (value: string) => {
  return value.replace(/\\(n|r|t|"|\\)/g, (_, char: string) => {
    if (char === "n") {
      return "\n";
    }
    if (char === "r") {
      return "\r";
    }
    if (char === "t") {
      return "\t";
    }
    return char;
  });
};

export const parseEnv = (text: string) => {
  const rows: EnvRow[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(KEY_PATTERN);
    if (!match) {
      continue;
    }

    const key = match[1];
    let raw = match[2];
    const quote = raw[0];

    if (quote === '"' || quote === "'" || quote === "`") {
      let body = raw.slice(1);
      while (!new RegExp(`(^|[^\\\\])${quote}\\s*(#.*)?$`).test(body) && index + 1 < lines.length) {
        index += 1;
        body += `\n${lines[index]}`;
      }
      const end = body.lastIndexOf(quote);
      let value = body;
      if (end !== -1) {
        value = body.slice(0, end);
      }
      if (quote === '"') {
        value = unescapeDouble(value);
      }
      rows.push({ key, value });
      continue;
    }

    const comment = raw.search(/\s#/);
    if (comment !== -1) {
      raw = raw.slice(0, comment);
    }
    rows.push({ key, value: raw.trim() });
  }

  return rows;
};

const needsQuotes = (value: string) => /[\s#"'\\]/.test(value) || value === "";

export const stringifyEnv = (rows: EnvRow[]) => {
  return rows
    .filter((row) => row.key.trim())
    .map((row) => {
      if (!needsQuotes(row.value)) {
        return `${row.key}=${row.value}`;
      }
      const escaped = row.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `${row.key}="${escaped}"`;
    })
    .join("\n");
};

export const mergeEnv = (rows: EnvRow[], incoming: EnvRow[]) => {
  const merged = rows.filter((row) => row.key.trim());
  for (const item of incoming) {
    const existing = merged.findIndex((row) => row.key === item.key);
    if (existing === -1) {
      merged.push(item);
    } else {
      merged[existing] = item;
    }
  }
  return merged;
};
