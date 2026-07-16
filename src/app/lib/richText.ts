// 关联业务：将管理端 Markdown/HTML 规范化为后台可校验、业主端可展示的安全富文本。
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "pre",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "hr",
  "del",
  "code",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function formatInline(value: string) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(repair-image:\/\/(\d+)\)/g, '<img data-repair-image-id="$2" alt="$1">')
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\+\+([^+]+)\+\+/g, "<u>$1</u>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
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
  const alignments = tableCells(lines[start + 1].trim()).map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });
  const headers = tableCells(lines[start].trim()).map((cell, index) => {
    const align = alignments[index] ?? "left";
    return `<th data-align="${align}">${formatInline(cell)}</th>`;
  });
  const rows: string[] = [];
  let index = start + 2;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || !line.includes("|")) break;
    const cells = tableCells(line).map((cell, cellIndex) => {
      const align = alignments[cellIndex] ?? "left";
      return `<td data-align="${align}">${formatInline(cell)}</td>`;
    });
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
  let codeBlock: string[] = [];
  let inCodeBlock = false;

  function flushList() {
    if (list.length === 0) return;
    out.push(`<${listType}>${list.map((item) => `<li>${item}</li>`).join("")}</${listType}>`);
    list = [];
  }

  function flushCodeBlock() {
    if (!inCodeBlock) return;
    out.push(`<pre><code>${escapeHtml(codeBlock.join("\n")).replace(/\n/g, "<br>")}</code></pre>`);
    codeBlock = [];
    inCodeBlock = false;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
        codeBlock = [];
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlock.push(raw);
      continue;
    }
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
    } else if (line.startsWith("#### ")) {
      flushList();
      out.push(`<h4>${formatInline(line.slice(5).trim())}</h4>`);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(`<h3>${formatInline(line.slice(4).trim())}</h3>`);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(`<h2>${formatInline(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("# ")) {
      flushList();
      out.push(`<h1>${formatInline(line.slice(2).trim())}</h1>`);
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote>${formatInline(line.slice(2).trim())}</blockquote>`);
    } else if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      if (list.length > 0 && listType !== "ul") flushList();
      listType = "ul";
      const checked = /\[[xX]\]/.test(line) ? "☑" : "☐";
      list.push(`${checked} ${formatInline(line.replace(/^[-*]\s+\[[ xX]\]\s+/, ""))}`);
    } else if (/^[-*]\s+/.test(line)) {
      if (list.length > 0 && listType !== "ul") flushList();
      listType = "ul";
      list.push(formatInline(line.replace(/^[-*]\s+/, "")));
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
  flushCodeBlock();
  return out.join("");
}

function sanitizeTaggedHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*("[^"]*javascript:[^"]*"|'[^']*javascript:[^']*'|[^\s>]*javascript:[^\s>]*)/gi, "")
    .replace(/<a\s+[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi, (_match, _raw, doubleUrl, singleUrl, bareUrl) => {
      const href = String(doubleUrl ?? singleUrl ?? bareUrl ?? "");
      if (!/^https?:\/\//i.test(href)) return "<a>";
      return `<a href="${escapeAttribute(href)}">`;
    })
    .replace(/<(th|td)\s+[^>]*data-align\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi, (_match, tag, _raw, doubleAlign, singleAlign, bareAlign) => {
      const align = String(doubleAlign ?? singleAlign ?? bareAlign ?? "").toLowerCase();
      if (!["left", "center", "right"].includes(align)) return `<${tag}>`;
      return `<${tag} data-align="${align}">`;
    })
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag: string) => {
      const safeTag = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(safeTag)) return "";
      if (match.startsWith("</")) return `</${safeTag}>`;
      if (safeTag === "a") {
        const hrefMatch = match.match(/\shref="([^"]*)"/i);
        return hrefMatch ? `<a href="${hrefMatch[1]}">` : "<a>";
      }
      if (safeTag === "th" || safeTag === "td") {
        const alignMatch = match.match(/\sdata-align="(left|center|right)"/i);
        return alignMatch ? `<${safeTag} data-align="${alignMatch[1].toLowerCase()}">` : `<${safeTag}>`;
      }
      if (safeTag === "img") {
        const imageIdMatch = match.match(/\sdata-repair-image-id\s*=\s*["']?(\d+)["']?/i);
        const altMatch = match.match(/\salt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const alt = String(altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? "现场图片");
        if (imageIdMatch && Number(imageIdMatch[1]) > 0) {
          return `<img data-repair-image-id="${imageIdMatch[1]}" alt="${escapeAttribute(alt)}">`;
        }
        const srcMatch = match.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const src = String(srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? "");
        return /^https:\/\//i.test(src)
          ? `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}">`
          : "";
      }
      return `<${safeTag}>`;
    });
}

export function toMiniappRichText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const html = /<\/?[a-z][\s\S]*>/i.test(trimmed)
    ? sanitizeTaggedHtml(trimmed)
    : paragraphizePlainText(trimmed);
  return html.replace(/>\s+</g, "><").trim();
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
