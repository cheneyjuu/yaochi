const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
  "del",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function tableCells(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableStart(lines: string[], index: number) {
  const current = lines[index]?.trim() ?? "";
  const next = lines[index + 1]?.trim() ?? "";
  return current.includes("|") && isTableSeparator(next);
}

function renderTable(lines: string[], start: number) {
  const headers = tableCells(lines[start].trim()).map((cell) => `<th>${formatInline(cell)}</th>`);
  const rows: string[] = [];
  let index = start + 2;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || !line.includes("|")) break;
    const cells = tableCells(line).map((cell) => `<td>${formatInline(cell)}</td>`);
    rows.push(`<tr>${cells.join("")}</tr>`);
    index += 1;
  }

  return {
    html: `<table><thead><tr>${headers.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`,
    nextIndex: index,
  };
}

function paragraphizePlainText(value: string) {
  const lines = value.split(/\r?\n/);
  const out: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" = "ul";

  function flushList() {
    if (list.length === 0) return;
    out.push(`<${listType}>${list.map((item) => `<li>${item}</li>`).join("")}</${listType}>`);
    list = [];
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (isTableStart(lines, i)) {
      flushList();
      const table = renderTable(lines, i);
      out.push(table.html);
      i = table.nextIndex - 1;
    } else if (line === "---" || line === "***") {
      flushList();
      out.push("<hr>");
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(`<h3>${formatInline(line.slice(4).trim())}</h3>`);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(`<h2>${formatInline(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("# ")) {
      flushList();
      out.push(`<h2>${formatInline(line.slice(2).trim())}</h2>`);
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote>${formatInline(line.slice(2).trim())}</blockquote>`);
    } else if (line.startsWith("- ")) {
      if (list.length > 0 && listType !== "ul") flushList();
      listType = "ul";
      list.push(formatInline(line.slice(2).trim()));
    } else if (/^\d+\.\s+/.test(line)) {
      if (list.length > 0 && listType !== "ol") flushList();
      listType = "ol";
      list.push(formatInline(line.replace(/^\d+\.\s+/, "")));
    } else {
      flushList();
      out.push(`<p>${formatInline(line)}</p>`);
    }
  }
  flushList();
  return out.join("");
}

function sanitizeTaggedHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*("[^"]*javascript:[^"]*"|'[^']*javascript:[^']*'|[^\s>]*javascript:[^\s>]*)/gi, "")
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag: string) => {
      const safeTag = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(safeTag)) return "";
      return match.startsWith("</") ? `</${safeTag}>` : `<${safeTag}>`;
    });
}

export function toMiniappRichText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const html = /<\/?[a-z][\s\S]*>/i.test(trimmed)
    ? sanitizeTaggedHtml(trimmed)
    : paragraphizePlainText(trimmed);
  return html.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

export function richTextToPlain(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h2|h3|h4|blockquote|tr)>/gi, "\n")
    .replace(/<\/(th|td)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
