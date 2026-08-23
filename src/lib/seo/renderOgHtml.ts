import type { HeadResult } from "@/lib/seo/marketShareMeta";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Minimal HTML document for social crawlers (Facebook, Telegram, etc.). */
export function renderOgHtml(head: HeadResult): string {
  const tags: string[] = [];

  for (const entry of head.meta) {
    if ("title" in entry) {
      tags.push(`<title>${escapeHtml(entry.title)}</title>`);
    } else if ("name" in entry) {
      tags.push(`<meta name="${escapeHtml(entry.name)}" content="${escapeHtml(entry.content)}" />`);
    } else if ("property" in entry) {
      tags.push(
        `<meta property="${escapeHtml(entry.property)}" content="${escapeHtml(entry.content)}" />`,
      );
    }
  }

  for (const link of head.links ?? []) {
    tags.push(`<link rel="${escapeHtml(link.rel)}" href="${escapeHtml(link.href)}" />`);
  }

  return `<!DOCTYPE html><html lang="en"><head>${tags.join("")}</head><body></body></html>`;
}
