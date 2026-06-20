"use client";

/**
 * 轻量 Markdown 渲染组件
 * 支持标题、列表、粗体、引用、分隔线、段落
 * 不引入外部依赖，保持简洁
 */
import { useMemo } from "react";

export function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="prose prose-sm max-w-none text-ink [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-5 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-1.5 [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:pl-4 [&_li]:my-0.5 [&_li]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-accent/30 [&_blockquote]:pl-3 [&_blockquote]:text-secondary [&_blockquote]:text-xs [&_blockquote]:my-2 [&_strong]:font-semibold [&_strong]:text-ink [&_hr]:my-4 [&_hr]:border-border [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (inList && listType) {
      html += `</${listType}>`;
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 空行
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // 分隔线
    if (/^---+$/.test(line.trim())) {
      closeList();
      html += "<hr />";
      continue;
    }

    // 标题
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      closeList();
      html += `<h3>${inline(h3[1])}</h3>`;
      continue;
    }
    if (h2) {
      closeList();
      html += `<h2>${inline(h2[1])}</h2>`;
      continue;
    }
    if (h1) {
      closeList();
      html += `<h1>${inline(h1[1])}</h1>`;
      continue;
    }

    // 引用
    const quote = line.match(/^> (.+)/);
    if (quote) {
      closeList();
      html += `<blockquote>${inline(quote[1])}</blockquote>`;
      continue;
    }

    // 有序列表
    const ol = line.match(/^\d+\.\s+(.+)/);
    if (ol) {
      if (!inList || listType !== "ol") {
        closeList();
        html += "<ol>";
        inList = true;
        listType = "ol";
      }
      html += `<li>${inline(ol[1])}</li>`;
      continue;
    }

    // 无序列表
    const ul = line.match(/^[-*]\s+(.+)/);
    if (ul) {
      if (!inList || listType !== "ul") {
        closeList();
        html += "<ul>";
        inList = true;
        listType = "ul";
      }
      html += `<li>${inline(ul[1])}</li>`;
      continue;
    }

    // 普通段落
    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  return html;
}

/** 行内格式：粗体、代码 */
function inline(text: string): string {
  let result = escapeHtml(text);
  // 粗体
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // 行内代码
  result = result.replace(/`(.+?)`/g, "<code>$1</code>");
  return result;
}
