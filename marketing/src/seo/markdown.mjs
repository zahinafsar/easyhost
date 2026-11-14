const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const inline = (text) => {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|`[^`]+`)/g);
  return parts
    .map((part) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        if (link[2].startsWith("http")) {
          return `<a href="${link[2]}" rel="noopener">${inline(link[1])}</a>`;
        }
        return `<a href="${link[2]}">${inline(link[1])}</a>`;
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return escapeHtml(part).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    })
    .join("");
};

const tableCells = (line) => {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
};

const renderTable = (rows) => {
  const head = tableCells(rows[0])
    .map((cell) => `<th>${inline(cell)}</th>`)
    .join("");
  const body = rows
    .slice(2)
    .map((row) => {
      const cells = tableCells(row)
        .map((cell) => `<td>${inline(cell)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
};

export const renderMarkdown = (markdown) => {
  const lines = markdown.split("\n");
  const out = [];
  const toc = [];
  let sectionOpen = false;
  let index = 0;

  const closeSection = () => {
    if (sectionOpen) {
      out.push("</section>");
      sectionOpen = false;
    }
  };

  const collect = (test) => {
    const items = [];
    while (index < lines.length && test(lines[index])) {
      items.push(lines[index]);
      index += 1;
    }
    return items;
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
    } else if (line.startsWith("```")) {
      const label = line.slice(3).trim();
      index += 1;
      const code = collect((current) => !current.startsWith("```"));
      index += 1;
      let labelHtml = "";
      if (label) {
        labelHtml = `<div class="code-label">${escapeHtml(label)}</div>`;
      }
      out.push(`<div class="code">${labelHtml}<pre>${escapeHtml(code.join("\n"))}</pre></div>`);
    } else if (line.startsWith("## ")) {
      closeSection();
      const title = line.slice(3).trim();
      const id = slugify(title);
      toc.push({ id, title });
      out.push(`<section id="${id}">`, `<h2>${inline(title)}</h2>`);
      sectionOpen = true;
      index += 1;
    } else if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4).trim())}</h3>`);
      index += 1;
    } else if (line.startsWith("> ")) {
      const quote = collect((current) => current.startsWith("> ")).map((current) => current.slice(2));
      out.push(`<div class="note"><p>${inline(quote.join(" "))}</p></div>`);
    } else if (line.startsWith("- ")) {
      const items = collect((current) => current.startsWith("- ")).map((current) => `<li>${inline(current.slice(2))}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
    } else if (/^\d+\. /.test(line)) {
      const items = collect((current) => /^\d+\. /.test(current)).map((current) => `<li>${inline(current.replace(/^\d+\. /, ""))}</li>`);
      out.push(`<ol>${items.join("")}</ol>`);
    } else if (line.startsWith("|")) {
      out.push(renderTable(collect((current) => current.startsWith("|"))));
    } else {
      const paragraph = collect((current) => {
        return current.trim() && !/^(```|## |### |> |- |\d+\. |\|)/.test(current);
      });
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    }
  }
  closeSection();
  return { html: out.join("\n"), toc };
};

export { escapeHtml };
